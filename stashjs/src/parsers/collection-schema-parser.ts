import * as D from 'io-ts/Decoder'
import * as DE from 'io-ts/DecodeError'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { Err, Ok, Result, gather } from '../result'
import { DynamicMatchMapping, ExactMapping, ExactMappingFieldType, FieldDynamicMatchMapping, Mappings, MatchMapping, MatchMappingFieldType, RangeMapping, RangeMappingFieldType, StashRecord } from '../dsl/mappings-dsl'
import { isRight } from 'fp-ts/lib/Either'
import { DowncaseFilter, NgramTokenizer, StandardTokenizer, UpcaseFilter } from '../dsl/filters-and-tokenizers-dsl'

export type CollectionSchemaDefinition = D.TypeOf<typeof CollectionSchemaDefDecoder>

type IndexDefinitionDecoder<R extends StashRecord> = D.Decoder<object, Mappings<R>>

const decoder = <R extends StashRecord>(): IndexDefinitionDecoder<R> => ({
    decode: input => {
      const result = IndexesDecoder.decode(input)
      if (isRight(result)) {
        return D.success(result.right as Mappings<R>)
      } else {
        return D.failure(result.left, "Failed to parse index definitions")
      }
    }
})

const TokenFilterDecoder = D.sum('kind')({
  downcase: D.struct<DowncaseFilter>({ kind: D.literal('downcase') }),
  upcase: D.struct<UpcaseFilter>({ kind: D.literal('upcase') }),
  ngram: D.struct<NgramTokenizer>({ kind: D.literal('ngram'), tokenLength: D.number }),
})

const TokenizerDecoder = D.sum('kind')({
  standard: D.struct<StandardTokenizer>({ kind: D.literal('standard') }),
  ngram: D.struct<NgramTokenizer>({ kind: D.literal('ngram'), tokenLength: D.number }),
})

// NOTE: the types ExactMapping, RangeMapping and MatchMapping take type
// arguments that we cannot know at deserialisation time. Which is why we
// perform some runtime type checking (see: function
// typecheckCollectionSchemaDefinition).

const ExactIndexDecoder = D.struct<ExactMapping<any, any>>({
  kind: D.literal("exact"),
  field: D.string
})

const RangeIndexDecoder = D.struct<RangeMapping<any, any>>({
  kind: D.literal("range"),
  field: D.string
})

const MatchIndexDecoder = D.struct<MatchMapping<any, any>>({
  kind: D.literal("match"),
  fields: D.array(D.string),
  tokenFilters: D.array(TokenFilterDecoder),
  tokenizer: TokenizerDecoder
})

const DynamicMatchIndexDecoder = D.struct<DynamicMatchMapping>({
  kind: D.literal("dynamic-match"),
  tokenFilters: D.array(TokenFilterDecoder),
  tokenizer: TokenizerDecoder
})

const FieldDynamicMatchIndexDecoder = D.struct<FieldDynamicMatchMapping>({
  kind: D.literal("field-dynamic-match"),
  tokenFilters: D.array(TokenFilterDecoder),
  tokenizer: TokenizerDecoder
})

const IndexDecoder = D.union(ExactIndexDecoder, RangeIndexDecoder, MatchIndexDecoder, DynamicMatchIndexDecoder, FieldDynamicMatchIndexDecoder)
type Index = D.TypeOf<typeof IndexDecoder>

const IndexesDecoder = D.record(IndexDecoder)

const parseIndexDefinition: <R extends StashRecord>(document: object) => Result<Mappings<R>, string> = <R extends StashRecord>(document: object) => {
  const parsed = decoder<R>().decode(document)
  if (isRight(parsed)) {
    return Ok(parsed.right)
  } else {
    return Err(D.draw(parsed.left))
  }
}

const FieldTypeDecoder = D.union(
  D.literal('string'),
  D.literal('number'),
  D.literal('bigint'),
  D.literal('date'),
  D.literal('boolean'),
)

const TypeDecoder: D.Decoder<unknown, unknown> = D.lazy('TypeDecoder', () => D.record(D.union(FieldTypeDecoder, TypeDecoder)))

const CollectionSchemaDefDecoder = D.struct({
  type: TypeDecoder,
  indexes: IndexesDecoder
})

export const parseCollectionSchemaJSON: (s: string) => Result<CollectionSchemaDefinition, string> = (s) => {
  const parsedAndTypeChecked = CollectionSchemaDefinitionFromJSON.decode(s)
  if (isRight(parsedAndTypeChecked)) {
    return Ok(parsedAndTypeChecked.right)
  } else {
    return Err(draw(parsedAndTypeChecked.left))
  }
}

export const generateSchemaDefinitionFromJSON = async (s: string): Promise<CollectionSchemaDefinition> => {
  const parsedAndTypeChecked = CollectionSchemaDefinitionFromJSON.decode(s)
  if (isRight(parsedAndTypeChecked)) {
    return Promise.resolve(parsedAndTypeChecked.right)
  } else {
    return Promise.reject(draw(parsedAndTypeChecked.left))
  }
}

const JSONDecoder: D.Decoder<string, object> = pipe(
  D.string,
  D.parse(s => {
    try {
      return D.success(JSON.parse(s))
    } catch (err: any) {
      return D.failure(s, `Input is not valid JSON: ${err?.message}`)
    }
  })
)

const CollectionSchemaDefinitionFromJSON: D.Decoder<string, CollectionSchemaDefinition> = pipe(
  JSONDecoder,
  D.parse(json => {
    try {
      return CollectionSchemaDefDecoder.decode(json)
    } catch (err: any) {
      return D.failure(json, `Collection schema is not valid JSON: ${err?.message}`)
    }
  }),
  D.parse((cs) => {
    const checked = typecheckCollectionSchemaDefinition(cs)
    if (checked.ok) {
      return D.success(checked.value)
    } else {
      return D.failure(cs, checked.error)
    }
  })
)

// This should check the index definitions against the record type to ensure it makes sense.
// Indexed fields MUST:
//    - exist on the type
//    - be of a type that is compitible with the index type
const typecheckCollectionSchemaDefinition: (
  def: CollectionSchemaDefinition
) => Result<CollectionSchemaDefinition, string> = (def) => {
  const checked = gather(Object.values(def.indexes).map(index => typecheckIndex(def.type, index)))
  if (checked.ok) {
    return Ok(def)
  } else {
    return Err(checked.error)
  }
}


type TypeName<T> =
  T extends string ? "string" :
  T extends number ? "number" :
  T extends boolean ? "boolean" :
  T extends bigint ? "bigint" :
  T extends Date ? "date" :
  never

const EXACT_TYPES: Array<TypeName<ExactMappingFieldType>> = ["string", "number", "bigint", "date", "boolean"]
const RANGE_TYPES: Array<TypeName<RangeMappingFieldType>> = ["number", "bigint", "date", "boolean"]
const MATCH_TYPES: Array<TypeName<MatchMappingFieldType>> = ["string"]

function typecheckIndex(recordType: unknown, index: Index): Result<void | Array<void>, string> {
  switch (index.kind) {
    case "exact": return fieldExists("exact", recordType, index.field.split("."), EXACT_TYPES)
    case "range": return fieldExists("range", recordType, index.field.split("."), RANGE_TYPES)
    case "match": return gather(index.fields.map(field => fieldExists("match", recordType, field.split("."), MATCH_TYPES)))
    case "dynamic-match": return Ok()
    case "field-dynamic-match": return Ok()
  }
}

function fieldExists(indexType: string, recordType: any, path: Array<string>, expectedTypes: Array<string>): Result<void, string> {
  let currentType = recordType
  for (let part of path) {
    currentType = currentType[part]
    if (typeof currentType === 'undefined') {
      return Err(`field ${path} not found in type`)
    }
  }

  if (expectedTypes.includes(currentType)) {
    return Ok()
  } else {
    return Err( `index type "${indexType}" works on fields of type "${expectedTypes.join(", ")}" but field "${path}" is of type "${currentType}"`)
  }
}

export const PRIVATE = {
  fieldExists,
  typecheckIndex,
  typecheckCollectionSchemaDefinition,
  parseCollectionSchemaJSON,
  parseIndexDefinition,
  ExactIndexDecoder,
  MatchIndexDecoder,
  RangeIndexDecoder
}

//----------------------------------------------------------------------------
// The following code is lifted from io-ts (MIT licensed)
//
// It's more generic than what we need as it supports rendering out all parse
// errors into a tree but our parser only ever returns one error at a time.
//----------------------------------------------------------------------------

interface Tree<A> {
  readonly value: A
  readonly forest: ReadonlyArray<Tree<A>>
}

const empty: Array<never> = []

const make = <A>(value: A, forest: ReadonlyArray<Tree<A>> = empty): Tree<A> => ({
  value,
  forest
})

const drawTree = (tree: Tree<string>): string => tree.value + drawForest('\n', tree.forest)

const drawForest = (indentation: string, forest: ReadonlyArray<Tree<string>>): string => {
  let r = ''
  const len = forest.length
  let tree: Tree<string>
  for (let i = 0; i < len; i++) {
    tree = forest[i]!
    const isLast = i === len - 1
    r += indentation + (isLast ? '└' : '├') + '─ ' + tree.value
    r += drawForest(indentation + (len > 1 && !isLast ? '│  ' : '   '), tree.forest)
  }
  return r
}

const toTree: (e: DE.DecodeError<string>) => Tree<string> = DE.fold({
  Leaf: (_input, error) => make(error),
  Key: (key, kind, errors) => make(`${kind} property ${JSON.stringify(key)}`, toForest(errors)),
  Index: (index, kind, errors) => make(`${kind} index ${index}`, toForest(errors)),
  Member: (index, errors) => make(`member ${index}`, toForest(errors)),
  Lazy: (id, errors) => make(`lazy type ${id}`, toForest(errors)),
  Wrap: (error, errors) => make(error, toForest(errors))
})

const toForest = (e: D.DecodeError): ReadonlyArray<Tree<string>> => {
  const stack = []
  let focus = e
  const res = []
  while (true) {
    switch (focus._tag) {
      case 'Of':
        res.push(toTree(focus.value))
        const tmp = stack.pop()
        if (tmp === undefined) {
          return res
        } else {
          focus = tmp
        }
        break
      case 'Concat':
        stack.push(focus.right)
        focus = focus.left
        break
    }
  }
}

export const draw = (e: D.DecodeError): string => toForest(e).map(drawTree).join('\n')

export const stringify: <A>(e: E.Either<D.DecodeError, A>) => string =
  /*#__PURE__*/
  E.fold(draw, (a) => JSON.stringify(a, null, 2))

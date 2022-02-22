import * as D from 'io-ts/Decoder'
import { Err, Ok, Result, gather } from '../result'
import { DynamicMatchMapping, ExactMapping, ExactMappingFieldType, FieldDynamicMatchMapping, Mappings, MatchMapping, MatchMappingFieldType, RangeMapping, RangeMappingFieldType, StashRecord } from '../dsl/mappings-dsl'
import { isRight } from 'fp-ts/lib/Either'
import { DowncaseFilter, NgramTokenizer, StandardTokenizer, UpcaseFilter } from '../dsl/filters-and-tokenizers-dsl'

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

export const TokenFilterDecoder = D.sum('kind')({
  downcase: D.struct<DowncaseFilter>({ kind: D.literal('downcase') }),
  upcase: D.struct<UpcaseFilter>({ kind: D.literal('upcase') }),
  ngram: D.struct<NgramTokenizer>({ kind: D.literal('ngram'), tokenLength: D.number }),
})

export const TokenizerDecoder = D.sum('kind')({
  standard: D.struct<StandardTokenizer>({ kind: D.literal('standard') }),
  ngram: D.struct<NgramTokenizer>({ kind: D.literal('ngram'), tokenLength: D.number }),
})

// NOTE: the types ExactMapping, RangeMapping and MatchMapping take type
// arguments that we cannot know at deserialisation time. Which is why we
// perform some runtime type checking (see: function
// typecheckCollectionSchemaDefinition).

export const ExactIndexDecoder = D.struct<ExactMapping<any, any>>({
  kind: D.literal("exact"),
  field: D.string
})

export const RangeIndexDecoder = D.struct<RangeMapping<any, any>>({
  kind: D.literal("range"),
  field: D.string
})

export const MatchIndexDecoder = D.struct<MatchMapping<any, any>>({
  kind: D.literal("match"),
  fields: D.array(D.string),
  tokenFilters: D.array(TokenFilterDecoder),
  tokenizer: TokenizerDecoder
})

export const DynamicMatchIndexDecoder = D.struct<DynamicMatchMapping>({
  kind: D.literal("dynamic-match"),
  tokenFilters: D.array(TokenFilterDecoder),
  tokenizer: TokenizerDecoder
})

export const FieldDynamicMatchIndexDecoder = D.struct<FieldDynamicMatchMapping>({
  kind: D.literal("field-dynamic-match"),
  tokenFilters: D.array(TokenFilterDecoder),
  tokenizer: TokenizerDecoder
})

const IndexDecoder = D.union(ExactIndexDecoder, RangeIndexDecoder, MatchIndexDecoder, DynamicMatchIndexDecoder, FieldDynamicMatchIndexDecoder)
type Index = D.TypeOf<typeof IndexDecoder>

export const IndexesDecoder = D.record(IndexDecoder)

export const parseIndexDefinition: <R extends StashRecord>(document: object) => Result<Mappings<R>, string> = <R extends StashRecord>(document: object) => {
  const parsed = decoder<R>().decode(document)
  if (isRight(parsed)) {
    return Ok(parsed.right)
  } else {
    return Err(D.draw(parsed.left))
  }
}

export const FieldTypeDecoder = D.union(
  D.literal('string'),
  D.literal('number'),
  D.literal('bigint'),
  D.literal('date'),
  D.literal('boolean'),
)

export const TypeDecoder: D.Decoder<unknown, unknown> = D.lazy('TypeDecoder', () => D.record(D.union(FieldTypeDecoder, TypeDecoder)))

export const CollectionSchemaDefDecoder = D.struct({
  type: TypeDecoder,
  indexes: IndexesDecoder
})

export const parseCollectionSchemaDefinition: (
  document: object
) => Result<CollectionSchemaDefinition, string> = (document) => {
  const parsed = CollectionSchemaDefDecoder.decode(document)
  if (isRight(parsed)) {
    return Ok(parsed.right)
  } else {
    return Err(D.draw(parsed.left))
  }
}

// This should check the index definitions against the record type to ensure it makes sense.
// Indexed fields MUST:
//    - exist on the type
//    - be of a type that is compitible with the index type
export const typecheckCollectionSchemaDefinition: (
  def: CollectionSchemaDefinition
) => Result<CollectionSchemaDefinition, string> = (def) => {
  const checked = gather(Object.values(def.indexes).map(index => typecheckIndex(def.type, index)))
  if (checked.ok) {
    return Ok(def)
  } else {
    return Err(checked.error)
  }
}

export type CollectionSchemaDefinition = D.TypeOf<typeof CollectionSchemaDefDecoder>

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
    case "dynamic-match": return Ok(void 0)
    case "field-dynamic-match": return Ok(void 0)
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
    return Ok(void 0)
  } else {
    return Err( `index type "${indexType}" works on fields of type "${expectedTypes.join(", ")}" but field "${path}" is of type "${currentType}"`)
  }
}
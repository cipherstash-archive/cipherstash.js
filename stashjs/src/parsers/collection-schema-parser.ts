import * as D from 'io-ts/Decoder'
import { Err, Ok, Result, gather } from '../result'
import { Mappings, StashRecord } from '../dsl/mappings-dsl'
import { isRight } from 'fp-ts/lib/Either'

type IndexDefinitionDecoder<R extends StashRecord> = D.Decoder<object, Mappings<R>>

const decoder = <R extends StashRecord>(): IndexDefinitionDecoder<R> => ({
    decode: input => {
      const result = Indexes.decode(input)
      if (isRight(result)) {
        return D.success(result.right as Mappings<R>)
      } else {
        return D.failure(result.left, "Failed to parse index definitions")
      }
    }
})

export const ExactIndex = D.struct({
  kind: D.literal("exact"),
  field: D.string
})

export const RangeIndex = D.struct({
  kind: D.literal("range"),
  field: D.string
})

export const TokenFilter = D.sum('kind')({
  downcase: D.struct({ kind: D.literal('downcase') }),
  upcase: D.struct({ kind: D.literal('upcase') }),
  standard: D.struct({ kind: D.literal('standard') }),
  ngram: D.struct({ kind: D.literal('ngram'), tokenLength: D.number }),
})

export const Tokenizer = D.sum('kind')({
  standard: D.struct({ kind: D.literal('standard') }),
  ngram: D.struct({ kind: D.literal('ngram'), tokenLength: D.number }),
})

export const MatchIndex = D.struct({
  kind: D.literal("match"),
  fields: D.array(D.string),
  tokenFilters: D.array(TokenFilter),
  tokenizer: Tokenizer
})

export const DynamicMatchIndex = D.struct({
  kind: D.literal("dynamic-match"),
  fields: D.array(D.string),
  tokenFilters: D.array(TokenFilter),
  tokenizer: Tokenizer
})

export const FieldDynamicMatchIndex = D.struct({
  kind: D.literal("field-dynamic-match"),
  fields: D.array(D.string),
  tokenFilters: D.array(TokenFilter),
  tokenizer: Tokenizer
})

const IndexDecoder = D.union(ExactIndex, RangeIndex, MatchIndex, DynamicMatchIndex, FieldDynamicMatchIndex)
type Index = D.TypeOf<typeof IndexDecoder>

export const Indexes = D.record(IndexDecoder)

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

export const CollectionSchemaDef = D.struct({
  type: TypeDecoder,
  indexes: Indexes
})

export const parseCollectionSchemaDefinition: (
  document: object
) => Result<CollectionSchemaDefinition, string> = (document) => {
  const parsed = CollectionSchemaDef.decode(document)
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


export type CollectionSchemaDefinition = D.TypeOf<typeof CollectionSchemaDef>

const EXACT_TYPES = ["string", "number", "bigint", "date", "boolean"]
const RANGE_TYPES = ["number", "bigint", "date", "boolean"]
const MATCH_TYPES = ["string"]

function typecheckIndex(recordType: unknown, index: Index): Result<void | Array<void>, string> {
  switch (index.kind) {
    case "exact": return fieldExists("exact", recordType, index.field.split("."), EXACT_TYPES)
    case "range": return fieldExists("range", recordType, index.field.split("."), RANGE_TYPES)
    case "match": return gather(index.fields.map(field => fieldExists("match", recordType, field.split("."), MATCH_TYPES)))
    case "dynamic-match": return gather(index.fields.map(field => fieldExists("dynamic-match", recordType, field.split("."),MATCH_TYPES)))
    case "field-dynamic-match": return gather(index.fields.map(field => fieldExists("field-dynamic-match", recordType, field.split("."), MATCH_TYPES)))
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
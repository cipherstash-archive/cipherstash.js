import * as D from 'io-ts/Decoder'
import { Err, Ok, Result } from '../result'
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
  matcher: D.literal("exact"),
  field: D.string
})

export const RangeIndex = D.struct({
  matcher: D.literal("range"),
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
  matcher: D.literal("match"),
  fields: D.array(D.string),
  tokenFilters: D.array(TokenFilter),
  tokenizer: Tokenizer
})

export const DynamicMatchIndex = D.struct({
  matcher: D.literal("dynamic-match"),
  fields: D.array(D.string),
  tokenFilters: D.array(TokenFilter),
  tokenizer: Tokenizer
})

export const FieldDynamicMatchIndex = D.struct({
  matcher: D.literal("field-dynamic-match"),
  fields: D.array(D.string),
  tokenFilters: D.array(TokenFilter),
  tokenizer: Tokenizer
})

export const Indexes = D.record(D.union(ExactIndex, RangeIndex, MatchIndex, DynamicMatchIndex, FieldDynamicMatchIndex))

export const parseIndexDefinition: <R extends StashRecord>(document: object) => Result<Mappings<R>, string> = <R extends StashRecord>(document) => {
  const parsed = decoder<R>().decode(document)
  if (isRight(parsed)) {
    return Ok(parsed.right)
  } else {
    return Err(D.draw(parsed.left))
  }
}
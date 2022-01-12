import { TokenFilter, Tokenizer } from "./filters-and-tokenizers-dsl"
import { FieldOfType, FieldType } from "../type-utils"

/**
 * A new record is permitted to not already have an assigned ID (the client will
 * create an ID when one is not already set).
 */
export type StashRecord = { id?: string }

export type HasID = { id: string }

/**
 * Fields of this type can be indexed and queried.
 */
export type MappableFieldType =
  | ExactMappingFieldType
  | RangeMappingFieldType
  | MatchMappingFieldType

/**
 * The types that exact mappings can be defined on.
 */
export type ExactMappingFieldType =
  | string
  | number
  | bigint
  | Date
  | boolean

/**
 * The types that range mappings  can be defined on.
 */
export type RangeMappingFieldType =
  | number
  | bigint
  | Date
  | boolean

/**
 * The types that match mappings can be defined on.
 */
export type MatchMappingFieldType = string

/**
 * An exact mapping on a field on a record.
 */
export type ExactMapping<
  R extends StashRecord,
  F extends FieldOfType<R, ExactMappingFieldType>
>  = {
  matcher: "exact",
  field: F
}

/**
 * A range mapping on a field on a record.
 */
export type RangeMapping<
  R extends StashRecord,
  F extends FieldOfType<R, RangeMappingFieldType>
>  = {
  matcher: "range",
  field: F
}

/**
 * A match mapping on a field on a record.
 */
export type MatchMapping<
  R extends StashRecord,
  F extends FieldOfType<R, MatchMappingFieldType>
>  = {
  matcher: "match",
  fields: Array<F>,
  options: MatchOptions
}

/**
 * A dynamic version of match mapping. This mapping matches all string fields in
 * a document, regardless of depth. All of the terms will be run through the
 * same text preprocessing pipeline and all terms will be stored in the same
 * index.
 *
 * Every term is first siphashed and then ORE encrypted.
 */
export type DynamicMatchMapping = {
  matcher: "dynamic-match",
  options: MatchOptions
}

/**
 * A dynamic version of match mapping. This mapping matches all string fields in
 * a document, regardless of depth. All of the terms will be run through the
 * same text preprocessing pipeline and all terms will be stored in the same
 * index.
 *
 * Every term is first siphashed and then ORE encrypted.
 */
export type FieldDynamicMatchMapping = {
  matcher: "field-dynamic-match",
  options: MatchOptions
}

/**
 * Guard function to check for exact mappings
 */
export function isExactMapping<
  R extends StashRecord,
  F extends FieldOfType<R, ExactMappingFieldType>,
  >(
    mapping: any
  ): mapping is ExactMapping<R, F> {
  return mapping.matcher == "exact"
}

/**
 * Guard function to check for range mappings
 */
export function isRangeMapping<
  R extends StashRecord,
  F extends FieldOfType<R, RangeMappingFieldType>,
  >(
    mapping: any
  ): mapping is RangeMapping<R, F> {
  return mapping.matcher == "range"
}

/**
 * Guard function to check for match mappings
 */
export function isMatchMapping<
  R extends StashRecord,
  F extends FieldOfType<R, string>,
  >(
    mapping: any
  ): mapping is MatchMapping<R, F> {
  return mapping.matcher == "match"
}

/**
 * Guard function to check for dynamic match mappings
 */
export function isDynamicMatchMapping(
    mapping: any
  ): mapping is DynamicMatchMapping {
  return mapping.matcher == "dynamic-match"
}

/**
 * Guard function to check for dynamic match mappings
 */
export function isFieldDynamicMatchMapping(
    mapping: any
  ): mapping is FieldDynamicMatchMapping {
  return mapping.matcher == "field-dynamic-match"
}

/**
 * This type represents all of the kinds of permitted mapping types allowed on a record.
 */
export type MappingOn<R extends StashRecord> =
  | ExactMapping<R, FieldOfType<R, ExactMappingFieldType>>
  | RangeMapping<R, FieldOfType<R, RangeMappingFieldType>>
  | MatchMapping<R, FieldOfType<R, MatchMappingFieldType>>
  | DynamicMatchMapping
  | FieldDynamicMatchMapping

/**
 * This type represents an object whose keys are the name of the index being
 * defined and whose values are the mappings. Values of this type will be
 * serialized and stored with the a Collection in the data-service.
 */
export type Mappings<R extends StashRecord> = {
  [key: string]: MappingOn<R>
}

/**
 * This is a utility type that when provided with a StashRecord type and a
 * MappingOn on that StashRecord type it will return the type of the underlying
 * field on the StashRecord type (e.g. string or boolean etc)
 */
export type FieldTypeOfMapping<R extends StashRecord, M extends MappingOn<R>> =
  M extends ExactMapping<R, infer FOT> ? FieldType<R, FOT>
  : M extends RangeMapping<R, infer FOT> ? FieldType<R, FOT>
  : M extends MatchMapping<R, infer FOT> ? FieldType<R, FOT> // Should be MatchMappingFieldType
  : M extends DynamicMatchMapping ? MatchMappingFieldType
  : M extends FieldDynamicMatchMapping ? MatchMappingFieldType
  : never

/**
 * This type represents some auto-generated meta information about a
 * Mappings<R>. It associates a plain text $indexName and $indexId (UUID)
 * and also stores the encryption key for the index.
 */
export type MappingsMeta<M> =
  M extends Mappings<infer _R> ? {
    [F in keyof M]-?: {
      $indexName: string,
      $indexId: string,
      $prfKey: Buffer,
      $prpKey: Buffer
    }
  } : never

// TODO: support options for string (token filters etc)
// TODO: support options for date (resolution etc)
// TODO: support options for bigint (clamp or throw for out-of-range)
type ExactFn<R extends StashRecord> =
  <F extends FieldOfType<R, ExactMappingFieldType>>(field: F) => ExactMapping<R, F>

// TODO: support options for string (token filters etc)
// TODO: support options for bigint (clamp or throw for out-of-range)
// TODO: support options for date (resolution etc)
export function makeExactFn<R extends StashRecord>(): ExactFn<R> {
  return (field) => ({ matcher: "exact", field })
}

// TODO: support options for date (resolution etc)
// TODO: support options for bigint (clamp or throw for out-of-range)
export type RangeFn<R extends StashRecord> =
  <F extends FieldOfType<R, RangeMappingFieldType>>(field: F) => RangeMapping<R, F>

export function makeRangeFn<R extends StashRecord>(): RangeFn<R> {
  return (field) => ({ matcher: "range", field })
}

export type MatchOptions = {
  tokenFilters: Array<TokenFilter | Tokenizer>
  tokenizer: Tokenizer
}

export type MatchFn<R extends StashRecord> = <F extends FieldOfType<R, MatchMappingFieldType>>(
  field: Array<F>,
  options: MatchOptions
) => MatchMapping<R, F>

export function makeMatchFn<R extends StashRecord>(): MatchFn<R> {
  return (fields, options) => ({ matcher: "match", fields, options })
}

export type DynamicMatchFn = (options: MatchOptions) => DynamicMatchMapping

export function makeDynamicMatchFn(): DynamicMatchFn {
  return (options) => ({ matcher: "dynamic-match", options })
}

export type FieldDynamicMatchFn = (options: MatchOptions) => FieldDynamicMatchMapping

export function makeFieldDynamicMatchFn(): FieldDynamicMatchFn {
  return (options) => ({ matcher: "field-dynamic-match", options })
}

export type MappingsDSL<R extends StashRecord> = {
  Exact: ExactFn<R>,
  Range: RangeFn<R>,
  Match: MatchFn<R>,
  DynamicMatch: DynamicMatchFn,
  FieldDynamicMatch: FieldDynamicMatchFn,
}

export function makeMappingsDSL<R extends StashRecord>(): MappingsDSL<R> {
  return {
    Exact: makeExactFn<R>(),
    Range: makeRangeFn<R>(),
    Match: makeMatchFn<R>(),
    DynamicMatch: makeDynamicMatchFn(),
    FieldDynamicMatch: makeFieldDynamicMatchFn(),
  }
}

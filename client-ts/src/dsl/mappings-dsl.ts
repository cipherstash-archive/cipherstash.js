import { TokenFilter, Tokenizer } from "./filters-and-tokenizers-dsl"
import { FieldOfType, FieldType, Optional } from "../type-utils"

/**
 * All user-defined type that is stored in a Collection must extend this type.
 */
export type StashRecord = { id: string }

/**
 * A new record is permitted to not already have an assigned ID (the client will
 * create an ID when one is not already set).
 */
export type NewStashRecord<R extends StashRecord> = Optional<R, 'id'>

/**
 * Fields of this type can be indexed and queried.
 */
export type MappableFieldType =
  | number
  | string
  | bigint
  | boolean
  | Date

/**
 * The Javascript types that we support range operations upon.
 */
export type RangeType =
  | number
  | bigint
  | Date
  | boolean

/**
 * A field mapping that permits an equality operation (`eq`) to be performed at
 * query time.
 */
export type ExactMappingKind = "exact"

/**
 * A field mapping that permits range operations (`lt`, `lte`, 'eq`, `gt`,
 * `gte`, `between`) to be performed on its index.
 */
export type RangeMappingKind = "range"

/**
 * A field mapping that permits textual match operations to be performed on its
 * index.
 */
export type MatchMappingKind = "match"

export type ExactMapping<
  R extends StashRecord,
  F extends FieldOfType<R, MappableFieldType>
>  = {
  matcher: "exact",
  field: F
}

export type RangeMapping<
  R extends StashRecord,
  F extends FieldOfType<R, RangeType>
>  = {
  matcher: "range",
  field: F
}

export type MatchMapping<
  R extends StashRecord,
  F extends FieldOfType<R, string>
>  = {
  matcher: "match",
  fields: Array<F>
}

export function isExactMapping<
  R extends StashRecord,
  F extends FieldOfType<R, MappableFieldType>,
  >(
    mapping: any
  ): mapping is ExactMapping<R, F> {
  return mapping.matcher == "exact"
}

export function isRangeMapping<
  R extends StashRecord,
  F extends FieldOfType<R, RangeType>,
  >(
    mapping: any
  ): mapping is RangeMapping<R, F> {
  return mapping.matcher == "range"
}

export function isMatchMapping<
  R extends StashRecord,
  F extends FieldOfType<R, string>,
  >(
    mapping: any
  ): mapping is MatchMapping<R, F> {
  return mapping.matcher == "match"
}

/**
 * This type represents all of the kinds of permitted mapping types allowed on a record.
 */
export type MappingOn<R extends StashRecord> =
  | ExactMapping<R, FieldOfType<R, MappableFieldType>>
  | RangeMapping<R, FieldOfType<R, RangeType>>
  | MatchMapping<R, FieldOfType<R, string>>

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
  : M extends MatchMapping<R, infer FOT> ? FieldType<R, FOT>
  : never

/**
 * Right now this is just an alias for `string`, but the type name is a reminder
 * that we need to treat this as an opaque value.
 */
export type EncryptedIndexId = string

/**
 * This type represents some auto-generated meta information about a
 * Mappings<R>.  It associates a plain text $indexName and encrypted $indexId
 * and also stores the encyrption key for the index.
 */
export type MappingsMeta<M> =
  M extends Mappings<infer _R> ? {
    [F in keyof M]: {
      $indexName: string,
      $indexId: EncryptedIndexId,
      $prf: Buffer,
      $prp: Buffer 
    } 
  } : never

// TODO: support options for string (token filters etc)
// TODO: support options for date (resolution etc)
// TODO: support options for bigint (clamp or throw for out-of-range)
type ExactFn<R extends StashRecord> =
  <F extends FieldOfType<R, MappableFieldType>>(field: F) => ExactMapping<R, F> 

// TODO: support options for string (token filters etc)
// TODO: support options for bigint (clamp or throw for out-of-range)
// TODO: support options for date (resolution etc)
export function makeExactFn<R extends StashRecord>(): ExactFn<R> {
  return (field) => ({ matcher: "exact", field }) 
}

// TODO: support options for date (resolution etc)
// TODO: support options for bigint (clamp or throw for out-of-range)
export type RangeFn<R extends StashRecord> =
  <F extends FieldOfType<R, RangeType>>(field: F) => RangeMapping<R, F> 

export function makeRangeFn<R extends StashRecord>(): RangeFn<R> {
  return (field) => ({ matcher: "range", field }) 
}

export type MatchOptions = {
  tokenFilters?: Array<TokenFilter>
  tokenizer: Tokenizer
}

export type MatchFn<R extends StashRecord> =
  <F extends FieldOfType<R, string>>(field: Array<F>, options: MatchOptions) =>
    MatchMapping<R, F> 

export function makeMatchFn<R extends StashRecord>(): MatchFn<R> {
  return (fields, options) => ({ matcher: "match", fields, ...options }) 
}

export type MappingsDSL<R extends StashRecord> = {
  Exact: ExactFn<R>,
  Match: MatchFn<R>,
  Range: RangeFn<R>,
}

export function makeMappingsDSL<R extends StashRecord>() {
  return {
    Exact: makeExactFn<R>(),
    Range: makeRangeFn<R>(),
    Match: makeMatchFn<R>(),
  }
}

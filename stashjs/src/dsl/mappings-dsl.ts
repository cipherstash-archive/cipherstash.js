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
 * This type represents all of the kinds of permitted mapping types allowed on a record.
 */
export type MappingOn<R extends StashRecord> =
  | ExactMapping<R, FieldOfType<R, ExactMappingFieldType>>
  | RangeMapping<R, FieldOfType<R, RangeMappingFieldType>>
  | MatchMapping<R, FieldOfType<R, MatchMappingFieldType>>

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

export type MatchFn<R extends StashRecord> =
  <F extends FieldOfType<R, MatchMappingFieldType>>(field: Array<F>, options: MatchOptions) => MatchMapping<R, F> 

export function makeMatchFn<R extends StashRecord>(): MatchFn<R> {
  return (fields, options) => ({ matcher: "match", fields, options }) 
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

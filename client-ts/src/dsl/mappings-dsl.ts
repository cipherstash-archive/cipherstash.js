import { TokenFilter, Tokenizer } from "./filters-and-tokenizers-dsl"
import { FieldOfType, FieldType, MappableFieldType, Optional } from "../type-utils"

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

/**
 * A mapping that uses a single field to build an index.
 */
export type SingleFieldMapping<
  R extends StashRecord,
  F extends FieldOfType<R, MappableFieldType>,
  M extends ExactMappingKind | RangeMappingKind
> = {
  matcher: M,
  field: F,
}

/**
 * A mapping that uses a multiple fields to build an index.
 * 
 * A `match` mapping is the only example of this currently. With this kind of
 * mapping it is possible to define full text search across all string fields in
 * a record.
 */
export type MultiFieldMapping<
  R extends StashRecord,
  F extends FieldOfType<R, MappableFieldType>,
  M extends MatchMappingKind
>  = {
  matcher: M,
  fields: Array<F>
}

/**
 * A type guard that returns true when its argument is a SingleFieldMapping.
 */
export function isSingleFieldMapping<
  R extends StashRecord,
  F extends FieldOfType<R, MappableFieldType>,
  M extends ExactMappingKind | RangeMappingKind
  >(
    mapping: any
  ): mapping is SingleFieldMapping<R, F, M> {
  return typeof((mapping as any).field) == 'string' && typeof((mapping as any).matcher) == 'string'
}

/**
 * A type guard that returns true when its argument is a MultiFieldMapping.
 */
export function isMultiFieldMapping<
  R extends StashRecord,
  F extends FieldOfType<R, MappableFieldType>,
  M extends MatchMappingKind
  >(
    mapping: any
  ): mapping is MultiFieldMapping<R, F, M> {
  return Array.isArray((mapping as any).fields) && typeof((mapping as any).matcher) == 'string'
}

/**
 * Values of this type are SingleFieldMapping or MultiFieldMapping on a record.
 */
export type MappingOnRecordFieldType<
  R extends StashRecord,
  F extends FieldOfType<R, MappableFieldType>,
  M extends ExactMappingKind | RangeMappingKind | MatchMappingKind
> = 
  M extends ExactMappingKind | RangeMappingKind ?
    SingleFieldMapping<R, F, M>
  : M extends MatchMappingKind ?
    MultiFieldMapping<R, F, M>
  : never

/**
 * This type represents all of the kinds of permitted mapping types allowed on a record.
 */
export type MappingOn<R extends StashRecord> =
  | MappingOnRecordFieldType<R, FieldOfType<R, string>, ExactMappingKind | MatchMappingKind>
  | MappingOnRecordFieldType<R, FieldOfType<R, boolean>, ExactMappingKind | RangeMappingKind>
  | MappingOnRecordFieldType<R, FieldOfType<R, number>, ExactMappingKind | RangeMappingKind>
  | MappingOnRecordFieldType<R, FieldOfType<R, bigint>, ExactMappingKind | RangeMappingKind>
  | MappingOnRecordFieldType<R, FieldOfType<R, Date>, ExactMappingKind | RangeMappingKind>

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
  M extends MappingOnRecordFieldType<R, infer FOT, infer _K> ? 
    FieldType<R, FOT>
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
  <F extends FieldOfType<R, MappableFieldType>>(field: F) => SingleFieldMapping<R, F, ExactMappingKind> 

// TODO: support options for string (token filters etc)
// TODO: support options for bigint (clamp or throw for out-of-range)
// TODO: support options for date (resolution etc)
export function makeExactFn<R extends StashRecord>(): ExactFn<R> {
  return (field) => ({ matcher: "exact", field }) 
}

// TODO: support options for date (resolution etc)
// TODO: support options for bigint (clamp or throw for out-of-range)
export type RangeFn<R extends StashRecord> = <F extends FieldOfType<R, MappableFieldType>>(field: F) =>
  SingleFieldMapping<R, F, RangeMappingKind> 

export function makeRangeFn<R extends StashRecord>(): RangeFn<R> {
  return (field) => ({ matcher: "range", field }) 
}

export type MatchOptions = {
  tokenFilters?: Array<TokenFilter>
  tokenizer: Tokenizer
}

export type MatchFn<R extends StashRecord> = <F extends FieldOfType<R, string>>(field: Array<F>, options: MatchOptions) =>
  MultiFieldMapping<R, F, MatchMappingKind> 

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

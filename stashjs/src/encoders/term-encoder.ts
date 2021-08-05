import { makeHashFn, DefaultKey } from '../crypto/sip-hash'
import { encodeNumber, decodeBigint } from '../crypto/ore'
import { TypeName, unreachable } from "../type-utils"
import { DateResolution, utcDateWithResolution } from './date-encoding-helpers'
import { MappableFieldType } from '../dsl/mappings-dsl'
export { DateResolution } from './date-encoding-helpers'

export const UINT64_MIN: bigint = 0n
export const UINT64_MAX: bigint = 18446744073709551615n

/**
 * A uint64 encoding of a source type that retains ordering properties of the
 * source type.
 * 
 * The type holds an uint64 that was encoded from an input value.  We also track
 * the type of the input value - that means the compiler will catch accidental
 * mixing of values encoded from different source types.
 */
export type OrderPreservingUInt64<FromT extends MappableFieldType> = {
  readonly sourceType: TypeName<FromT>
  readonly orderable: bigint
}

/**
 * A uint64 encoding of a source type that retains equality properties of the
 * source type. This type cannot be meaningfully used for sorting on.
 * 
 * The type holds an uint64 that was encoded from an input value.  We also track
 * the type of the input value - that means the compiler will catch accidental
 * mixing of values encoded from different source types.
 */
export type EqualityPreservingUInt64<FromT extends MappableFieldType> = {
  readonly sourceType: TypeName<FromT>
  readonly equatable: bigint
}

type TermEncoder<InputT extends MappableFieldType, OutputT> = (input: InputT) => OutputT
export type EqualityPreservingEncoder<InputT extends MappableFieldType> = TermEncoder<InputT, EqualityPreservingUInt64<InputT>>
export type OrderPreservingEncoder<InputT extends MappableFieldType> = TermEncoder<InputT, OrderPreservingUInt64<InputT>>

// FIXME: get rid of this default key
const sipHash = makeHashFn(DefaultKey)


export function encodeOrderable<T extends number | boolean | bigint | Date>(term: T): OrderPreservingUInt64<T> {
  if (typeof term == 'number') {
    return encodeOrderableNumber(term) as OrderPreservingUInt64<T>
  } else if (typeof term == 'boolean') {
    return encodeOrderableBoolean(term) as OrderPreservingUInt64<T>
  } else if (typeof term == 'bigint') {
    return encodeOrderableBigInt(term) as OrderPreservingUInt64<T>
  } else if (term instanceof Date) {
    return encodeOrderableDateWithResolution("millisecond")(term) as OrderPreservingUInt64<T>
  }
  throw unreachable(`Unexpected term type for term <${JSON.stringify(term)}>`)
}

export function encodeEquatable<T extends number | boolean | bigint | string | Date>(term: T): EqualityPreservingUInt64<T> {
  if (typeof term == 'number') {
    return encodeEquatableNumber(term) as EqualityPreservingUInt64<T>
  } else if (typeof term == 'boolean') {
    return encodeEquatableBoolean(term) as EqualityPreservingUInt64<T>
  } else if (typeof term == 'bigint') {
    return encodeEquatableBigInt(term) as EqualityPreservingUInt64<T>
  } else if (term instanceof Date) {
    return encodeEquatableDateWithResolution("millisecond")(term) as EqualityPreservingUInt64<T>
  } else if (typeof term == 'string') {
    return encodeEquatableString(term) as EqualityPreservingUInt64<T>
  }
  throw unreachable(`Unexpected term type for term <${JSON.stringify(term)}>`)
}

const encodeOrderableNumber: OrderPreservingEncoder<number> =
  term =>
    ({ sourceType: "number", orderable: encodeNumber(term) })

const encodeOrderableBigInt: OrderPreservingEncoder<bigint> =
  term =>
    ({ sourceType: "bigint", orderable: term })
  
const encodeOrderableBoolean: OrderPreservingEncoder<boolean> =
  term =>
    ({ sourceType: "boolean", orderable: term ? 1n : 0n })

const encodeOrderableDateWithResolution: (resolution: DateResolution) => OrderPreservingEncoder<Date> =
  resolution =>
    term =>
      ({ sourceType: "Date", orderable: encodeNumber(utcDateWithResolution(term, resolution)) })

// TODO: decide how to handle bigints that are out of range (do we clamp to a
// min and max size, or do we throw an error?)
const encodeEquatableBigInt: EqualityPreservingEncoder<bigint> =
  term =>
    ({ sourceType: "bigint", equatable: term })

const encodeEquatableNumber: EqualityPreservingEncoder<number> =
  term =>
    ({ sourceType: "number", equatable: encodeNumber(term) })

const encodeEquatableBoolean: EqualityPreservingEncoder<boolean> =
  term =>
    ({ sourceType: "boolean", equatable: encodeNumber(term ? 1 : 0) })

// TODO: for strings 8 bytes or smaller we can encode directly into 64 bits.
// We should only siphash strings with an encoding of > 8 bytes.
const encodeEquatableString: EqualityPreservingEncoder<string> =
  term =>
    ({ sourceType: "string", equatable: sipHash(term).sipHash.readBigUInt64BE() })

const encodeEquatableDateWithResolution: (resolution: DateResolution) => EqualityPreservingEncoder<Date> =
  resolution =>
    term =>
      ({ sourceType: "Date", equatable: encodeNumber(utcDateWithResolution(term, resolution)) })

// This is used for testing purposes only.
export const decodeOrderable: <OutputT extends MappableFieldType>(value: OrderPreservingUInt64<OutputT>) => number
  = value =>
    decodeBigint(value.orderable)

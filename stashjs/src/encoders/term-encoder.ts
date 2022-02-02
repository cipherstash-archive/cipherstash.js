import { ORE } from '@cipherstash/ore-rs'
import { unreachable } from "../type-utils"
import { utcDateWithResolution } from './date-encoding-helpers'
import { MappableFieldType } from '../dsl/mappings-dsl'

export const UINT64_MIN: bigint = 0n
export const UINT64_MAX: bigint = 18446744073709551615n

type TermEncoder<InputT extends MappableFieldType, OutputT> = (input: InputT) => OutputT
export type EqualityPreservingEncoder<InputT extends MappableFieldType> = TermEncoder<InputT, number>
export type OrderPreservingEncoder<InputT extends MappableFieldType> = TermEncoder<InputT, number>

export function encodeTerm<T extends number | boolean | bigint | string | Date>(term: T): number {
  if (typeof term == 'number') {
    return ORE.encodeNumber(term)
  } else if (typeof term == 'boolean') {
    return ORE.encodeNumber(term ? 1 : 0)
  } else if (typeof term == 'bigint') {
    let buf = Buffer.allocUnsafe(8)
    buf.writeBigUInt64BE(term)
    return ORE.encodeBuffer(buf)
  } else if (term instanceof Date) {
    return ORE.encodeNumber(utcDateWithResolution(term, "millisecond"))
  } else if (typeof term == 'string') {
    // NOTE: because string are siphashed before encrypting only == makes sense (< & > are meaningless).
    return ORE.encodeString(term)
  }
  throw unreachable(`Unexpected term type for term <${JSON.stringify(term)}>`)
}
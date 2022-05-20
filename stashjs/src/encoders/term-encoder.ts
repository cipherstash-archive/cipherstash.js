import { ORE, OrePlainText } from "@cipherstash/stash-rs"
import { unreachable } from "../type-utils"
import { TermType } from "../record-type-definition"

export const UINT64_MIN: bigint = 0n
export const UINT64_MAX: bigint = 18446744073709551615n

export function asUint64(term: unknown): Buffer {
  if (typeof term !== "bigint") {
    throw new Error("Expected term of type 'uint64'")
  }

  if (term > UINT64_MAX) {
    throw new Error("Bigint term is greater than uint64 max")
  }

  // Create a native endian buffer that contains a u64
  return Buffer.from(BigUint64Array.from([term]).buffer, 0, 8)
}

export function asDate(term: unknown): number {
  if (!(term instanceof Date)) {
    throw new Error("Expected term of type 'date'")
  }

  // Get the number of milliseconds since Jan 1, 1970 UTC
  return term.getTime()
}

export function asFloat64(term: unknown): number {
  if (typeof term !== "number") {
    throw new Error("Expected term of type 'float64'")
  }

  return term
}

export const encodeTermType: (termType: TermType) => (term: any) => Array<OrePlainText> = termType => {
  switch (termType) {
    case "string":
      return encodeString
    case "float64":
      return encodeNumber
    case "uint64":
      return encodeBigint
    case "boolean":
      return encodeBoolean
    case "date":
      return encodeDate
  }
}

function encodeString(term: any): Array<OrePlainText> {
  if (typeof term === "string") {
    return [ORE.encodeString(term)]
  }
  throw unreachable("Expected term of type 'string'")
}

function encodeNumber(term: any): Array<OrePlainText> {
  return [ORE.encodeNumber(asFloat64(term))]
}

function encodeBigint(term: any): Array<OrePlainText> {
  return [ORE.encodeBuffer(asUint64(term))]
}

function encodeBoolean(term: any): Array<OrePlainText> {
  if (typeof term === "boolean") {
    return [ORE.encodeNumber(term ? 1 : 0)]
  }
  throw unreachable("Expected term of type 'boolean'")
}

function encodeDate(term: any): Array<OrePlainText> {
  return [ORE.encodeNumber(asDate(term))]
}

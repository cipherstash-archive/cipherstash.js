import { ORE, OrePlainText } from "@cipherstash/ore-rs"
import { unreachable } from "../type-utils"
import { utcDateWithResolution } from "./date-encoding-helpers"
import { TermType } from "../record-type-definition"

export const UINT64_MIN: bigint = 0n
export const UINT64_MAX: bigint = 18446744073709551615n

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
  if (typeof term === "number") {
    return [ORE.encodeNumber(term)]
  }
  throw unreachable("Expected term of type 'float64'")
}

function encodeBigint(term: any): Array<OrePlainText> {
  if (typeof term === "bigint") {
    let buf = Buffer.allocUnsafe(8)
    buf.writeBigUInt64BE(term)
    return [ORE.encodeBuffer(buf)]
  }
  throw unreachable("Expected term of type 'uint64'")
}

function encodeBoolean(term: any): Array<OrePlainText> {
  if (typeof term === "boolean") {
    return [ORE.encodeNumber(term ? 1 : 0)]
  }
  throw unreachable("Expected term of type 'boolean'")
}

function encodeDate(term: any): Array<OrePlainText> {
  if (term instanceof Date) {
    return [ORE.encodeNumber(utcDateWithResolution(term, "millisecond"))]
  }
  throw unreachable("Expected term of type 'date'")
}

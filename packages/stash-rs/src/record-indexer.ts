import { Indexer } from "../pkg"
import { asBuffer } from "./utils"
const { encode, decode } = require("cbor")

/**
 * The collection schema used to initialize a RecordIndexer.
 *
 * This is base on the CipherStash [schema definition](https://docs.cipherstash.com/reference/schema-definition.html) and includes metadata required for encryption.
 */
export type IndexerCollectionSchema = {
  type: {
    [key: string]: unknown
  }
  indexes: {
    [key: string]: {
      kind: string
      prf_key: Buffer | Uint8Array
      prp_key: Buffer | Uint8Array
      index_id: Buffer | Uint8Array
      [key: string]: unknown
    }
  }
}

/**
 * The terms that can be used to insert a record into the index
 */
export type TermVector = Array<{
  terms: Array<{
    term: Buffer[]
    link: Buffer
  }>
  indexId: Buffer
}>

interface RecordLike {
  id: Buffer | Uint8Array
  [key: string]: unknown
}

export function isObject(value: unknown): value is { [key: string]: unknown } {
  return typeof value === "object" && value !== undefined && value !== null && !Array.isArray(value)
}

function coerceBuffers(value: { [key: string]: unknown }) {
  for (let key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const member = value[key]

      if (member instanceof Uint8Array) {
        value[key] = asBuffer(member)
      } else if (isObject(member)) {
        coerceBuffers(member)
      }
    }
  }
}

export class RecordIndexer {
  private constructor(private handle: Indexer) {}

  /**
   * Initialize as new RecordIndexer based on a collection schema
   */
  static init(schema: IndexerCollectionSchema): RecordIndexer {
    coerceBuffers(schema)
    return new RecordIndexer(new Indexer(encode(schema)))
  }

  /**
   * Encrypt a record and return an array of terms
   */
  encryptRecord(record: RecordLike): TermVector {
    coerceBuffers(record)
    return decode(this.handle.encrypt(encode(record)))
  }
}

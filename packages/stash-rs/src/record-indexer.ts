const { initIndexer, encryptRecord } = require("../index.node")
const { encode, decode } = require("cbor")

/**
 * A superset of the index mappings defined in the CipherStash [schema definition](https://docs.cipherstash.com/reference/schema-definition.html).
 */
interface MappingLike {
  kind: string
  [key: string]: unknown
}

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
      mapping: MappingLike
      prf_key: Buffer
      prp_key: Buffer
      index_id: Buffer
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

export class RecordIndexer {
  private constructor(private handle: unknown) {}

  /**
   * Initialize as new RecordIndexer based on a collection schema
   */
  static init(schema: IndexerCollectionSchema): RecordIndexer {
    return new RecordIndexer(initIndexer(encode(schema)))
  }

  /**
   * Encrypt a record and return an array of terms
   */
  encryptRecord(record: RecordLike): TermVector {
    return decode(
      encryptRecord(
        this.handle,
        encode({
          ...record,
          // Ensure that the id is the Buffer base class so it is encoded in CBOR properly
          id: record.id instanceof Uint8Array ? Buffer.prototype.slice.call(record.id) : record.id,
        })
      )
    )
  }
}

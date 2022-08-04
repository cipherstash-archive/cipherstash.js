import { RecordIndexer } from "./record-indexer"

const prf_key = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

const prp_key = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

const index_id = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

const record_id = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

describe("RecordIndexer", () => {


  describe("init", () => {
    test("load from schema", () => {
      expect(() =>
        RecordIndexer.init({
          type: {
            title: "string",
            runningTime: "uint64",
          },
          indexes: {
            exactTitle: {
              mapping: { kind: "exact", field: "title" },
              index_id,
              prf_key,
              prp_key,
            },
          },
        })
      ).not.toThrow()
    })

    test("invalid key in schema", () => {
      expect(() =>
        RecordIndexer.init({
          type: {
            title: "string",
            runningTime: "uint64",
          },
          indexes: {
            exactTitle: {
              mapping: { kind: "exact", field: "title" },
              index_id,
              prf_key: Buffer.from([1, 2]),
              prp_key,
            },
          },
        })
      ).toThrow(/invalid length 2/)
    })

    test("invalid index_id in schema", () => {
      expect(() =>
        RecordIndexer.init({
          type: {
            title: "string",
            runningTime: "uint64",
          },
          indexes: {
            exactTitle: {
              mapping: { kind: "exact", field: "title" },
              index_id: Buffer.from([1, 2, 3, 4]),
              prf_key,
              prp_key,
            },
          },
        })
      ).toThrow(/invalid length 4/)
    })
  })

  let indexer: RecordIndexer

  beforeEach(() => {
    indexer = RecordIndexer.init({
      type: {
        title: "string",
        runningTime: "uint64",
      },
      indexes: {
        exactTitle: {
          mapping: { kind: "exact", field: "title" },
          index_id,
          prf_key,
          prp_key,
        },
      },
    })
  })

  test("index record", () => {
    const vectors = indexer.encryptRecord({
      id: record_id,
      title: "What a great title!",
    })

    expect(vectors).toHaveLength(1)
  })

  test("index record empty record", () => {
    const vectors = indexer.encryptRecord({
      id: record_id,
    })

    expect(vectors).toHaveLength(0)
  })

  test("index record null fields", () => {
    const vectors = indexer.encryptRecord({
      id: record_id,
      title: null,
      runningTime: undefined
    })

    expect(vectors).toHaveLength(0)
  })

  test("index record must have id", () => {
    expect(() => indexer.encryptRecord(null as any)).toThrow()
  })

  test("index record with Uint8Array id", () => {
    const vectors = indexer.encryptRecord({
      id: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
      title: "Great title!",
    })

    expect(vectors).toHaveLength(1)
  })
})

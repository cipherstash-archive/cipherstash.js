const BSON = require("bson")

describe("Clarifying to ourselves how BSON works", () => {
  test("sanity test a roundtrip JS object with Long", () => {
    const obj = {
      field: BSON.Long.fromBigInt(1238765876587658765n)
    }

    const encoded = BSON.serialize(obj)
    const decoded = BSON.deserialize(encoded)

    expect(decoded).toEqual(obj)
  })
})

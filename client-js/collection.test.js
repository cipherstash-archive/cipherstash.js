const Secrets = require('./secrets')
const Collection = require('./collection')

const mockGetSecret = jest.fn().mockImplementation(() => {
  return Buffer.from("6ebf6d1af108a9b43a544304d6d7fd7664e7f8d10a1ede7d87197204445e9a14", "hex")
})

jest.mock('./secrets')

Secrets.getSecret = mockGetSecret

describe("makeRef", () => {
  test("that a ref is generated from the given name", async () => {
    const ref = await Collection.makeRef("people", "purple-monkey-6600")
    expect(ref).toEqual(Buffer.from("cb51bed863a832fa993a1c8a61eabd819cdfa3cb58b87341d6e3a694ccc2b885", "hex"))
  })
})

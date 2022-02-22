import { normalizeId, maybeGenerateId } from "./utils"

describe('utils', () => {
  it(`idToBuffer and maybeGenerateId are mutually consistent`, () => {
    const uuidString = 'aa85cde5-0bde-47a8-b1a6-b74bffbfde0d'
    const obj = { id: uuidString, foo: 123 }
    const objWithId = maybeGenerateId(obj)
    const otherId = normalizeId(uuidString)
    expect(objWithId.id).toEqual(otherId)
  })
})
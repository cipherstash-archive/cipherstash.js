import { extractStringFields, extractStringFieldsWithPath } from "./string-field-extractor"

describe("string-field-extractor", () => {
  const obj = {
    a: 123,
    b: {
      c: "hello",
      d: true
    },
    e: "world"
  }

  test("extractStringFields works", () => {
    expect(extractStringFields(obj).sort()).toStrictEqual(["hello", "world"])
  })

  test("extractStringFieldsWithPath works", () => {
    expect(extractStringFieldsWithPath(obj).sort()).toStrictEqual([["b.c", "hello"], ["e", "world"]])
  })
})
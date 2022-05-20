import { asDate } from "./term-encoder"

describe("asDate", () => {
  test("return UTC time from UTC date", () => {
    const date = new Date("Jan 1, 1970, 00:00:00.000 UTC")

    expect(asDate(date)).toEqual(0)
  })

  test("return UTC time from AEST date", () => {
    const date = new Date("Jan 1, 1970, 00:00:00.000 GMT+1000")

    expect(asDate(date)).toEqual(-36000000)
  })

  test("return UTC time from future AEST date", () => {
    const date = new Date("Jan 1, 2000, 12:34:56.000 GMT+1000")

    expect(asDate(date)).toEqual(946694096000)
  })

  test("throw error when date is invalid", () => {
    expect(() => asDate("wow")).toThrowError()
  })
})

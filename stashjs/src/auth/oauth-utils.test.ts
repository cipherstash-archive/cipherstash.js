import { isExpired } from "./oauth-utils"

describe("isExpired", () => {
  test("When now + buffer is less than expiry return false", () => {
    const now = 1652900000
    const buffer = 120000
    const expiry = now + buffer + 1

    const result = isExpired(buffer, expiry, now)
    expect(result).toEqual(false)
  })

  test("When now + buffer is greater or equal to expiry returns true", () => {
    const now = 1652900000
    const buffer = 120000
    const expiry = now + buffer

    const result = isExpired(buffer, expiry, now)
    expect(result).toEqual(true)
  })
})

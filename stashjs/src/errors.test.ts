import { toErrorMessage, wrap } from "./errors"

describe("errors", () => {
  describe("NativeError", () => {
    test("wraps an JS native Error", () => {
      let error = makeError()
      let wrapped = wrap(error)

      expect(wrapped.tag).toEqual("NativeError")
      expect(wrapped.cause).toBeInstanceOf(Error)
    })

    test("renders as an error with a stack trace", () => {
      let error = makeError()
      let wrapped = wrap(error)
      let messageLines = toErrorMessage(wrapped).split(/\n/)

      expect(messageLines[0]).toMatch("[JSError: Error] (Something went wrong!)")

      for (let index = 2; index < messageLines.length; index++) {
        expect(messageLines[index]).toMatch(/\s+at\s/)
      }
    })
  })

  // TODO: capture file & line numbers for non-native errors
})

function makeError(): any {
  try {
    throw new Error("Something went wrong!")
  } catch (err) {
    return err
  }
}
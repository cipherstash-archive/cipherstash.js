import { PlainError, toErrorMessage, wrap } from "./errors"

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

      expect(messageLines.length).toBeGreaterThan(3)
      for (let index = 2; index < messageLines.length; index++) {
        expect(messageLines[index]).toMatch(/\s+at\s/)
      }
    })
  })

  describe("Non-native errors", () => {
    test("renders as an error with source code location and line number", () => {
      let error = PlainError("This is a test error")
      let messageLines = toErrorMessage(error).split(/\n/)

      expect(messageLines[0]).toMatch("This is a test error")
      expect(messageLines[0]).toMatch(/src\/errors.test.ts:\d+/)
    })
  })

  describe("wrap", () => {
    test("wraps an error object", () => {
      expect(wrap(new Error('Uh oh!'))).toEqual({
        tag: 'NativeError',
        cause: expect.any(Error),
        caller: expect.objectContaining({})
      })
    })

    test("passes through a native error", () => {
      expect(wrap({ tag: 'NativeError', cause: new Error('Uh oh!'), caller: {} })).toEqual({
        tag: 'NativeError',
        cause: expect.any(Error),
        caller: expect.objectContaining({})
      })
    })

    test("throws if object is a stash error", () => {
      expect(() => wrap( PlainError('Uh oh!'))).toThrow('Trying to wrap a value that is a StashJSError: PlainError');
    })

    test("throws if object is a random object", () => {

      class MyClass {
        constructor(
          public field: string
        ) {}
      }

      expect(() => wrap(new MyClass('wow'))).toThrow('Trying to wrap a value that isn\'t an Error or NativeError: MyClass {"field":"wow"}')
    })
  });
})

function makeError(): any {
  return new Error("Something went wrong!")
}

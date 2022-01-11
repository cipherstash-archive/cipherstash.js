import { Ok, Err, concat, Unit, parallel, convertErrorsTo, gather, fromPromise,  sequence } from "./result"

describe("Result", () => {
  describe("concat", () => {
    it("with Ok results produces a new Ok result containing an array of success values", () => {
      expect(concat(Ok([1]), Ok(2))).toEqual(Ok([1, 2]))
    })

    it("with an Err result produces a new Err result containing the error ", () => {
      expect(concat(Ok([1]), Err("uh oh!"))).toEqual(Err("uh oh!"))
    })
  })

  describe("sequence", () => {
    it("can sequence functions", async () => {
      const addOne = (n: number) => Ok.Async(n + 1)
      const timesThree = (n: number) => Ok.Async(n * 3)
      const negate = (n: number) => Ok.Async(-n)

      const combined = sequence(addOne, timesThree, negate)
      expect(await combined(10)).toEqual(Ok(-33))
    })

    it("can sequence functions returning Err", async () => {
      const addOne = (n: number) => Ok.Async(n + 1)
      const timesThree = (_: number) => Err.Async("uh oh!")
      const negate = (n: number) => Ok.Async(-n)

      const combined = sequence(addOne, timesThree, negate)
      expect(await combined(10)).toEqual(Err("uh oh!"))
    })
  })

  describe("parallel", () => {
    it("combines two independent functions into a single function", async () => {
      const f1 = (_: Unit) => Ok.Async("Hello")
      const f2 = (_: Unit) => Ok.Async(123)

      expect(await parallel(f1, f2)(Unit)).toEqual(Ok([Unit, "Hello", 123]))
    })

    it("returns an Err if any function fails", async () => {
      const f1 = (_: Unit) => Err.Async("uh oh!")
      const f2 = (_: Unit) => Ok.Async(123)

      expect(await parallel(f1, f2)(Unit)).toEqual(Err("uh oh!"))

      const f3 = (_: Unit) => Ok.Async(123)
      const f4 = (_: Unit) => Err.Async("uh oh!")

      expect(await parallel(f3, f4)(Unit)).toEqual(Err("uh oh!"))
    })
  })

  describe("gather", () => {
    it("combines an array of results into a single result containing an array of success values", () => {
      const results = [Ok(1), Ok(2), Ok(3), Ok(4)]
      expect(gather(results)).toEqual(Ok([1, 2, 3, 4]))
    })

    it("when the input contains an error result the first error result is returned", () => {
      const results = [Ok(1), Err("uh oh!"), Ok(3), Ok(4)]
      expect(gather(results)).toEqual(Err("uh oh!"))
    })

    it("the returned error result is always the first error", () => {
      const results = [Ok(1), Err("uh oh!"), Err("no way!"), Ok(4)]
      expect(gather(results)).toEqual(Err("uh oh!"))
    })
  })

  describe("convertErrorsTo", () => {
    type CustomError = { message: string }
    const CustomError = (_: string): CustomError => ({ message: "OOPS!"})

    it("converts errors to a specified type", () => {
      expect(convertErrorsTo(CustomError, Err("uh oh!"))).toEqual(Err({ message: "OOPS!"}))
    })

    it("returns Ok results unmodified", () => {
      expect(convertErrorsTo(CustomError, Ok("yay!"))).toEqual(Ok("yay!"))
    })
  })

  describe("fromPromise", () => {
    type CustomError = { cause: unknown }
    const CustomError = (cause: unknown): CustomError => ({ cause })

    it("converts a function returning a Promise to a function returning an AsyncResult", async () => {
      const succeed = Promise.resolve("yay!")
      const result1 = fromPromise(succeed, CustomError)

      expect(await result1).toEqual(Ok("yay!"))
    })

    it("returns an Err result when the promise is rejected", async () => {
      const fail = Promise.reject("uh oh!")
      const result = fromPromise(fail, CustomError)

      expect(await result).toEqual(Err({ cause: "uh oh!" }))
    })
  })
})
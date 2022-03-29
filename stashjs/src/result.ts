import { unreachable } from "./type-utils"

/**
 * The return type of fallible operation that can either produce a success
 * result with a value or an error result.
 */
export type Result<V, E> =
  | Readonly<{ tag: 'Result.Ok', ok: true, value: V }>
  | Readonly<{ tag: 'Result.Err', ok: false, error: E }>

/**
 * Produces a success result.
 *
 * @param value the value to wrap
 * @returns the success result
 */
export function Ok<V>(value: V): Result<V, never>;
export function Ok(): Result<void, never>;
export function Ok<V>(value?: V): Result<typeof value, never> {
  return { tag: 'Result.Ok', ok: true, value: value }
}

export function isOk<V>(result: any): result is { tag: 'Result.Ok', ok: true, value: V } {
  return result?.ok === true
}

export function isErr<E>(result: any): result is { tag: 'Result.Err', ok: false, error: E } {
  return result?.ok === false
}

/**
 * Produces a failure result.
 *
 * @param error the error to wrap
 *
 * @returns the failure result
 */
export function Err<E>(error: E): Result<never, E> {
  return { tag: 'Result.Err', ok: false, error: error }
}

/**
 * In TypeScript a Promise only accepts a type parameter for the success result
 * which prevents exhaustive case analysis to ensure that all errors are
 * handled.  To work around this, StashJS mandates use of the AsyncResult type
 * wherever we would normally use a promise. This means Promises always resolve
 * (even for errors). The success type is a Result<E, R>. This means the
 * compiler can use exhaustive case analysis to ensure that all errors are
 * handled.
 *
 * StashJS considers all unhandled rejections as *bugs*.
 *
 * TODO: upgrade TypeScript then change definition to:
 * type AsyncResult<R, E> = Awaited<Result<R, E>>
*/
export type AsyncResult<V, E> = Promise<Result<V, E>>


/**
 * Converts a success result into an asynchronous success result.
 *
 * @param value the value to wrap
 * @returns an async success result
 */
Ok.Async = <V>(value: V) => Promise.resolve(Ok(value))

/**
 * Converts an error result into an asynchronous error result.
 *
 * @param error the error to wrap
 * @returns an async error result
 */
Err.Async = <E>(error: E) => Promise.resolve(Err(error))

/**
 * Utility function to convert a synchronouse result to an asyncronous result.
 *
 * @param result the result to convert
 * @returns a resolved AsyncResult
 */
export function toAsync<V, E>(result: Result<V, E>): AsyncResult<V, E> {
  if (result.ok) {
    return Ok.Async(result.value)
  } else {
    return Err.Async(result.error)
  }
}

/**
 * Concatenates a Result<Array<R>, E> with a Result<R, E> producing a new
 * Ok<Array<R>> both r1 and r2 are not Err<E>.
 *
 * @param r1 the result array
 * @param r2 a singular result
 *
 * @returns Ok<Array<R>> | Err<E>
 */
export function concat<V, E>(r1: Result<Array<V>, E>, r2: Result<V, E>): Result<Array<V>, E> {
  if (r1.ok && r2.ok) {
    return Ok(r1.value.concat([r2.value]))
  }

  if (!r1.ok) {
    return Err(r1.error)
  }

  if (!r2.ok) {
    return Err(r2.error)
  }

  return unreachable("Illegal State")
}

/**
 * Combines an Array<Result<V, E>> into a single Result<Array<V>, E>.
 *
 * If any of the results in the array is an Err<E> then the final result is an Err<E>.
 *
 * @param results the array of results to combine
 *
 * @returns Ok<Array<V>> | Err<E>
 */
export function gather<V, E>(results: Array<Result<V, E>>): Result<Array<V>, E> {
  return results.reduce<Result<Array<V>, E>>(concat, Ok<Array<V>>([]))
}

export async function gatherAsync<V, E>(asyncResults: Array<AsyncResult<V, E>>): AsyncResult<Array<V>, E> {
  const results = await Promise.all(asyncResults)
  return results.reduce<Result<Array<V>, E>>(concat, Ok<Array<V>>([]))
}

export function gatherTuple2<V1, E1, V2, E2>(results: [Result<V1, E1>, Result<V2, E2>]): Result<[V1, V2], E1 | E2> {
  return (gatherTupleImpl(results) as any) as Result<[V1, V2], E1 | E2>
}

export function gatherTuple3<V1, E1, V2, E2, V3, E3>(results: [Result<V1, E1>, Result<V2, E2>, Result<V3, E3>]): Result<[V1, V2, V3], E1 | E2 | E3> {
  return gatherTupleImpl(results) as any
}

function gatherTupleImpl(results: Array<Result<any, any>>): Result<Array<any>, any> {
  return results.reduce<Result<Array<any>, any>>(concat, Ok<Array<any>>([]))
}


/**
 * This is the primitive from which to build the 3 and 4 argument versions of sequence.
 *
 * @private
 */
function sequence2<V1, V2, V3, E1, E2>(
  fn1: (value: V1) => AsyncResult<V2, E1>,
  fn2: (value: V2) => AsyncResult<V3, E2>
): (value: V1) => AsyncResult<V3, E1 | E2> {
  return async (value: V1) => {
    const result1 = await fn1(value)
    if (result1.ok) {
      const result2 = await fn2(result1.value)
      if (result2.ok) {
        return Ok(result2.value)
      } else {
        return Err(result2.error)
      }
    } else {
      return Err(result1.error)
    }
  }
}

/**
 * Executes two (up to four) functions in sequence, feeding the success result
 * of the previous function into the sole argument of the next function in the
 * sequence. The final result is the AsyncResult of the final function in the
 * sequence.
 *
 * If a function in the sequence produces an error result then non of the
 * subsequent functions will be executed and the return value will be the error
 * result of the function that produced the error.
 *
 * @param fn1 the first function in the sequence
 * @param fn2 the second function in the sequence
 *
 * @returns a success result if all functions in the sequence succeeded or an error
 * result from the function in the sequence that failed.
 */
export function sequence<V1, V2, V3, E1, E2>(
  fn1: (value: V1) => AsyncResult<V2, E1>,
  fn2: (value: V2) => AsyncResult<V3, E2>
): (value: V1) => AsyncResult<V3, E1 | E2>
/**
 * @see {@link sequence<V1, V2, V3, E1, E2>}
 *
 * @param fn1 the first function in the sequence
 * @param fn2 the second function in the sequence
 * @param fn3 the third function in the sequence
 *
 * @returns a success result if all functions in the sequence succeeded or an error
 * result from the function in the sequence that failed.
 */
export function sequence<V1, V2, V3, V4, E1, E2, E3>(
  fn1: (value: V1) => AsyncResult<V2, E1>,
  fn2: (value: V2) => AsyncResult<V3, E2>,
  fn3: (value: V3) => AsyncResult<V4, E3>,
): (value: V1) => AsyncResult<V4, E1 | E2 | E3>
/**
 * @see {@link sequence<V1, V2, V3, V4, E1, E2, E3>}
 *
 * @param fn1 the first function in the sequence
 * @param fn2 the second function in the sequence
 * @param fn3 the third function in the sequence
 * @param fn4 the fourth function in the sequence
 *
 * @returns a success result if all functions in the sequence succeeded or an error
 * result from the function in the sequence that failed.
 */
export function sequence<V1, V2, V3, V4, V5, E1, E2, E3, E4>(
  fn1: (value: V1) => AsyncResult<V2, E1>,
  fn2: (value: V2) => AsyncResult<V3, E2>,
  fn3: (value: V3) => AsyncResult<V4, E3>,
  fn4: (value: V4) => AsyncResult<V5, E4>,
): (value: V1) => AsyncResult<V5, E1 | E2 | E3 | E4>
/**
 * Implementation.
 *
 * @private
 */
export function sequence<V1, V2, V3, V4, V5, E1, E2, E3, E4>(
  fn1: (value: V1) => AsyncResult<V2, E1>,
  fn2: (value: V2) => AsyncResult<V3, E2>,
  fn3?: (value: V3) => AsyncResult<V4, E3>,
  fn4?: (value: V4) => AsyncResult<V5, E4>,
): (value: V1) => AsyncResult<unknown, unknown> {
  switch (arguments.length) {
    case 2: return sequence2(fn1, fn2)
    case 3: return sequence2(sequence2(fn1, fn2), fn3!)
    case 4: return sequence2(sequence2(sequence2(fn1, fn2), fn3!), fn4!)
    default: return unreachable("Too many arguments to function `sequence`")
  }
}

export type Unit = {}
export const Unit: Unit = {}

/**
 * Converts two functions that return AsyncResult into one function that returns
 * an AsyncResult with a tuple of success values.
 *
 * `parallel` is typically useful when you want two independent operations to
 * participate in a `sequence` call.
 *
 * @param fn1
 * @param fn2
 * @returns a three-element tuple
 */
export function parallel<V0, V1, V2, E1, E2>(
  fn1: (initialValue: V0) => AsyncResult<V1, E1>,
  fn2: (initialValue: V0) => AsyncResult<V2, E2>
): (initialValue: V0) => AsyncResult<[V0, V1, V2], E1 | E2> {
  return async (initialValue: V0) => {
    const result = await parallel3<V0, V1, V2, V2, E1, E2, E2>(fn1, fn2, fn2)(initialValue)
    if (result.ok) {
      const [r0, r1, r2, _] = result.value
      return Ok([r0, r1, r2])
    } else {
      return Err(result.error)
    }
  }
}

export function parallel3<V0, V1, V2, V3, E1, E2, E3>(
  fn1: (initialValue: V0) => AsyncResult<V1, E1>,
  fn2: (initialValue: V0) => AsyncResult<V2, E2>,
  fn3: (initialValue: V0) => AsyncResult<V3, E3>
): (initialValue: V0) => AsyncResult<[V0, V1, V2, V3], E1 | E2 | E3> {
  return async (initialValue: V0) => {
    // Naively, one would think the following three lines of code would be
    // simpler if we just called Promise.all.  However, Promise.all takes an
    // array of promises and returns an array of results. Arrays can only have a
    // single type argument and so we need to work with tuples in order for each
    // element to have an independant type. So instead we kick of execution of
    // the promises manually and then just wait until they are settled.
    const result1 = fn1(initialValue)
    const result2 = fn2(initialValue)
    const result3 = fn3(initialValue)
    await Promise.allSettled([result1, result2, result3])

    // These will have already resolved. Unfortunately we need to await on them
    // again because JS does not provide a standard API to crack open a Promise
    // to grab the resolved value without using `await` or `.then` (which
    // requires another lap around the event loop)
    const r1 = await result1
    const r2 = await result2
    const r3 = await result3

    if (r1.ok && r2.ok && r3.ok) {
      return Ok([initialValue, r1.value, r2.value, r3.value])
    } else {
      if (!r1.ok) return Err(r1.error)
      else if (!r2.ok) return Err(r2.error)
      else if (!r3.ok) return Err(r3.error)
      else return unreachable("This cannot happen")
    }
  }
}

/**
 * Converts the error from a failure result to the error type returned by `errorConstructor`.
 *
 * If the result is a success it is simply returned.
 *
 * @param errorConstructor a constructor function that can build the required error type
 * @param result the result who's error (if it's a failure result) should be converted
 * @returns a new result value with the desired a error type
 */
export function convertErrorsTo<V, E1, E2>(
  errorConstructor: (rejection: E1) => E2,
  result: Result<V, E1>
): Result<V, E2> {
  if (result.ok) {
    return result
  } else {
    return Err(errorConstructor(result.error))
  }
}

export async function convertAsyncErrorsTo<V, E1, E2>(
  errorConstructor: (rejection: E1) => E2,
  result: AsyncResult<V, E1>
): AsyncResult<V, E2> {
  const finalResult = await result
  if (finalResult.ok) {
    return Ok(finalResult.value)
  } else {
    return Err(errorConstructor(finalResult.error))
  }
}

/**
 * Converts a Promise<R> to an AsyncResult<R, E>.
 *
 * This is useful for wrapping code from other 3rd-party modules to make them
 * compatible with the StashJS error handling convention.
 *
 * @param promise the promise to convert
 * @param errorConstructor an error constructor
 * @returns an AsyncResult
 */
export async function fromPromise<V, E>(
  promise: Promise<V>,
  errorConstructor: (rejection: any) => E
): AsyncResult<V, E> {
  try {
    return Ok(await promise)
  } catch(err: any) {
    return Err(errorConstructor(err))
  }
}

export function fromPromiseFn1<V, E, T>(
  fn: (arg: T) => Promise<V>,
  errorConstructor: (rejection: any) => E
): (arg: T) => AsyncResult<V, E> {
  return async (arg: T) => {
    try {
      return Ok(await fn(arg))
    } catch(err: any) {
      return Err(errorConstructor(err))
    }
  }
}

export function fromPromiseFn2<V, E, T1, T2>(
  fn: (arg1: T1, arg2: T2) => Promise<V>,
  errorConstructor: (rejection: any) => E
): (arg1: T1, arg2: T2) => AsyncResult<V, E> {
  return async (arg1: T1, arg2: T2) => {
    try {
      return Ok(await fn(arg1, arg2))
    } catch(err: any) {
      return Err(errorConstructor(err))
    }
  }
}

export async function convertPrivateApiResult<R, E>(asyncResult: AsyncResult<R, E>): Promise<R> {
  const result = await asyncResult
  if (result.ok) {
    return Promise.resolve(result.value)
  } else {
    return Promise.reject(result.error)
  }
}

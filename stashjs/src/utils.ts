import { v4 as uuidv4, parse as parseUUID, stringify as stringifyUUID } from 'uuid'
import stringifyObject from 'stringify-object'
import { unreachable } from './type-utils'
import { isAnyStashJSError, toErrorMessage } from './errors'

export function normalizeId(id: string): Uint8Array
export function normalizeId(id: Buffer): Uint8Array
export function normalizeId(id: Uint8Array): Uint8Array
export function normalizeId(id: string | Buffer | Uint8Array): Uint8Array  {
  if (typeof id === 'string') {
    return parseUUID(id) as Uint8Array
  } else if (id instanceof Buffer) {
    return new Uint8Array(id)
  } else if (id instanceof Uint8Array) {
    return id
  } else {
    throw unreachable("expected valid UUID (as a string), or a Buffer, or a Uint8Array")
  }
}

export function maybeGenerateId<D>(doc: D): Omit<D, 'id'> & { id: Uint8Array } {
  const id = (doc as any).id
  if (typeof id === 'undefined') {
     return { ...doc, id: makeId() }
  } else {
    return { ...doc, id: normalizeId(id) }
  }
}

export function makeId(): Uint8Array {
  return new Uint8Array(uuidv4({}, Buffer.alloc(16)))
}

export function idBufferToString(id: Uint8Array): string {
  return stringifyUUID(id!)
}

export function refBufferToString(ref: Buffer): string {
  if (ref.byteLength != 32) {
    throw new Error(`Expected a 16 byte Buffer; received: ${ref}`)
  }
  return ref.toString('hex')
}

export function refStringToBuffer(ref: string): Buffer {
  if (!ref.match(/^[0-9a-f]{64}$/)) {
    throw new Error("Expected a 64 character string of hex characters")
  }
  return Buffer.from(ref, 'hex');
}

const NANOSECONDS_PER_SECOND = 1000000000n
/**
 * Given two timestamps produced by calling process.hrtime.bigint(), return
 * a number (float!) representing the number of seconds (or part thereof)
 * between those two timestamps.
 */
export function durationSeconds(timeStart: bigint, timeEnd: bigint): number {
  const diff = timeEnd - timeStart
  const seconds = diff / NANOSECONDS_PER_SECOND
  const nanos   = diff % NANOSECONDS_PER_SECOND

  return Number(seconds) + Number(nanos) / Number(NANOSECONDS_PER_SECOND)
}

/**
 * Like JSON.stringify(...) but handles bigints and prettifies the output.
 *
 * NOTE: this is for debugging purposes ONLY.
 */
export function stringify(item: any): string {
  return stringifyObject(objectify(item), {
    indent: '  ',
    singleQuotes: false
  })
}

function objectify(item: any): any {
  if (Array.isArray(item)) {
    return item.map(elem => objectify(elem))
  } else if (item instanceof Uint8Array) {
    return (new Buffer(item)).toString('hex')
  } else if (Buffer.isBuffer(item)) {
    return item.toString('hex')
  } else if (typeof item == 'bigint') {
    return item.toString()
  } else if (typeof item == 'object') {
    return Object.fromEntries(Object.keys(item).map(key => [key, objectify(item[key])]))
  } else {
    return item
  }
}

export function describeError(err: unknown): string {
  if (isAnyStashJSError(err)) {
    return toErrorMessage(err);
  } else if (err instanceof Error) {
    return err.stack ? err.stack : String(err);
  } else {
    try {
      const stringified = JSON.stringify(err);

      if (stringified === "{}") {
        return String(err);
      } else {
        return stringified;
      }
    } catch (e) {
      return String(err);
    }
  }
}

export function inspect<T>(value: T, label?: string): T {
  if (label) {
    console.log({ [label]: value })
  } else {
    console.log(value)
  }
  return value
}

export async function* streamPlaintextRecords(plaintextRecords: Array<Object>) {
  for (let p of plaintextRecords) {
    yield p
  }
}

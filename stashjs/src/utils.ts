import { v4 as uuidv4, parse as parseUUID, stringify as stringifyUUID } from 'uuid'
import stringifyObject from 'stringify-object'

export function idStringToBuffer(id: string): Buffer {
  // Throws `TypeError` if id is not a valid UUID
  return parseUUID(id) as unknown as Buffer
}

export function idBufferToString(id: Buffer): string {
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

export function makeId(): Buffer {
  return uuidv4({}, Buffer.alloc(16))
}

export const biggest = (a: bigint, b: bigint) => a > b ? a : b

export const smallest = (a: bigint, b: bigint) => a < b ? a : b

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
  } else if (Buffer.isBuffer(item)) {
    return `ciphertext:${item.toString('hex')}`
  } else if (typeof item == 'bigint') {
    return `${item.toString()}n`
  } else if (typeof item == 'object') {
    return Object.fromEntries(Object.keys(item).map(key => [key, objectify(item[key])]))
  } else {
    return item
  }
}

export function describeError(err: any): string {
  if (err instanceof Error) {
    return err.message
  } else {
    return JSON.stringify(err)
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
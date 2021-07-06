import * as crypto from 'crypto'
import { getSecret } from './secrets'
import { v4 as uuidv4 } from 'uuid'

/**
 * Makes a collection ref (anonymised string)
 * from the given collection name.
 */
export async function makeRef(collectionName: string, clusterId: string): Promise<Buffer> {
  const { clusterKey } = await getSecret(`cs-cluster-secret-${clusterId}`)
  const clusterKeyBin = Buffer.from(clusterKey, "base64")

  const hmac = crypto.createHmac('sha256', clusterKeyBin)
  hmac.update(collectionName)
  return hmac.digest()
}

export function idStringToBuffer(id: string): Buffer {
  if (!id.match(/^[0-9a-f]{32}$/)) {
    throw new Error("Expected a 32 character string of hex characters")
  }
  return Buffer.from(id, 'hex');
}

export function idBufferToString(id: Buffer): string {
  if (id.byteLength != 16) {
    throw new Error(`Expected a 16 byte Buffer; received: ${id}`)
  }
  return id.toString('hex')
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
 * Like JSON.stringify(...) but handles bigints.
 * 
 * NOTE: this is for debugging purposes ONLY.
 */
export const stringify = (value: any) =>
  JSON.stringify(value, (_key, value) =>
    typeof value === 'bigint'
      ? `bigint:${value.toString()}`
      : value
  )
import * as BSON from 'bson'

export function serialize(plaintext: any): Buffer {
  return BSON.serialize(encodeToBson(plaintext))
}

export function deserialize<T = any>(plaintext: Buffer): T {
  return decodeFromBson(BSON.deserialize(plaintext, { promoteBuffers: true }))
}

function encodeToBson(plaintext: any): BSON.Document {
  if (Array.isArray(plaintext)) {
    return plaintext.map(el => encodeToBson(el))
  } else if (plaintext instanceof Date) {
    return BSON.Timestamp.fromNumber(plaintext.getTime())
  } else if (typeof plaintext == 'bigint') {
    return BSON.Long.fromBigInt(plaintext)
  } else if (plaintext instanceof Buffer) {
    return plaintext
  } else if (plaintext instanceof Object) {
    return mapObjectValues(plaintext, (value: any) => encodeToBson(value))
  } else {
    return plaintext
  }
}

 function decodeFromBson(plaintext: BSON.Document): any {
  if (Array.isArray(plaintext)) {
    return plaintext.map(pt => decodeFromBson(pt))
  } else if (plaintext instanceof BSON.Timestamp) {
    return new Date(plaintext.toNumber())
  } else if (plaintext instanceof BSON.Long) {
    return plaintext.toBigInt()
  } else if (plaintext instanceof Buffer) {
    return plaintext
  } else if (plaintext instanceof Object) {
    return mapObjectValues(plaintext, (value: any) => decodeFromBson(value))
  } else {
    return plaintext
  }
}

function mapObjectValues(obj: { [key: string]: any }, valueMapper: (key: string) => any) {
  return Object.keys(obj).reduce((acc: object, key) => ({ ...acc, [key]: valueMapper(obj[key]) }), {})
}

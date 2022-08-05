/* Importing the rust compiled lib (index.node) doesn't work and so we use require here */
const {
  initCipher,
  encrypt,
  encryptLeft,
  compare,
  encodeNumber,
  encodeString,
  encodeBuffer,
  encodeRangeBetween,
  encodeRangeEq,
  encodeRangeGt,
  encodeRangeGte,
  encodeRangeLt,
  encodeRangeLte,
} = require("../index.node")

export type Key = Buffer
export type CipherText = Buffer
export type OrePlainText = Buffer
export type OreRange = { min: OrePlainText, max: OrePlainText }

export * from './record-indexer';

export type ORECipher = {
  /*
   * Encrypt the given `PlainText` outputting a "full" CipherText (i.e. a
   * `Buffer` containing both the Left and Right components).
   */
  encrypt: (input: OrePlainText) => CipherText,

  /*
   * Encrypt the given `PlainText` outputting only a Left CipherText (i.e. a
   * `Buffer` containing just the Left component).
   */
  encryptLeft: (input: OrePlainText) => CipherText
}

export type Ordering = -1 | 0 | 1

export interface ORE {
  /**
   * Converts a string to a ORE-compatible plaintext (a JS number). The number
   * is the siphash of the string.
   *
   * Ciphertexts made from the plaintext can only be meaningfully checked for
   * equality. In the medium term we will use an  equality revealing scheme for
   * strings.
   *
   * @param input the JS string to encode
   * @returns a JS number that can be encrypted with the ORE scheme
   */
  encodeString: (input: string) => OrePlainText

  /**
   * Prepares a plaintext (a JS number AKA f64) for ORE encryption by converting
   * to an orderable integer (u64).  The orderable integer is returned as a JS
   * number which will be different to the input plaintext and should be treated
   * as an opaque value.
   *
   * @param input the JS number to encode
   * @returns a JS number that can be encrypted with the ORE scheme
   */
  encodeNumber: (input: number) => OrePlainText

  /**
   * Converts an 8 byte buffer containing a 64 bit unsigned integer into an
   * ORE-compatible plaintext (a JS number).
   *
   * @param input the JS buffer to encode
   * @returns a JS number that can be encrypted with the ORE scheme
   */
  encodeBuffer: (input: Buffer) => OrePlainText

  encode: (input: number | Buffer | string) => OrePlainText


  encodeRangeLt: (value: number | Buffer) => OreRange
  encodeRangeLte: (value: number | Buffer) => OreRange
  encodeRangeGt: (value: number | Buffer) => OreRange
  encodeRangeGte: (value: number | Buffer) => OreRange
  encodeRangeEq: (value: number | Buffer) => OreRange
  encodeRangeBetween: (min: number | Buffer, max: number | Buffer) => OreRange

  /**
   * Initialize a new ORE cipher with a key pair (both keys must be 16-byte
   * buffers)
   */
  init: (k1: Key, k2: Key) => ORECipher

  /*
   * Compare two cipher texts returning -1 if a < b, 0 if a === b, and 1 if a >
   * b.  Throws if the inputs are not comparable.
   */
  compare: (a: CipherText, b: CipherText) => Ordering
}

/**
 * Module to perform Order-revealing Encryption using the underlying ore.rs Rust
 * library.
 */
export const ORE: ORE = {

  encodeNumber,
  encodeString,
  encodeBuffer,
  encode: input => {
    if (typeof input === 'number') {
      return encodeNumber(input)
    } else if (typeof input === 'string') {
      return encodeString(input)
    } else {
      return encodeBuffer(input)
    }
  },

  encodeRangeBetween,
  encodeRangeEq,
  encodeRangeGt,
  encodeRangeGte,
  encodeRangeLt,
  encodeRangeLte,

  init: (k1: Key, k2: Key): ORECipher => {
    let cipher = initCipher(k1, k2);
    return {
      encrypt: (input: OrePlainText): CipherText => encrypt(cipher, input),

      encryptLeft: (input: OrePlainText): CipherText => encryptLeft(cipher, input)
    }
  },

  compare: (a: CipherText, b: CipherText): Ordering => compare(a, b)
}

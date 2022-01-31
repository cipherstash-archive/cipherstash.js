"use strict";

/* Importing the rust compiled lib (index.node) doesn't work and so we use require here */
const {
  initCipher,
  encryptNum,
  encryptNumLeft,
  compare,
  encodeNum
} = require("../index.node");

export type Key = Buffer;
export type PlainText = number
export type CipherText = Buffer;

export type ORECipher = {
  encrypt: (input: PlainText) => CipherText,
  encryptLeft: (input: PlainText) => CipherText
}

/* Module to perform Order-revealing Encryption using the underlying ore.rs Rust library */
export const ORE = {

  /**
   * Prepares a plaintext (a JS number AKA f64) for ORE encryption by converting
   * to an orderable integer (u64).  The orderable integer is returned as a JS
   * number which will be different to the input plaintext and should be treated
   * as an opaque value.
   *
   * @param input the JS number to encode
   * @returns a JS number that can be encrypted with the ORE scheme
   */
  encode: encodeNum,

  /* Initialize a new ORE cipher with a key pair (both keys must be 16-byte buffers). */
  init: (k1: Key, k2: Key): ORECipher => {
    let cipher = initCipher(k1, k2);
    return {
      /*
       * Encrypt the given `PlainText` outputting a "full" CipherText (i.e. a `Buffer`
       * containing both the Left and Right components).
       */
      encrypt: (input: PlainText): CipherText => encryptNum(cipher, input),

      /*
       * Encrypt the given `PlainText` outputting only a Left CipherText (i.e. a `Buffer`
       * containing just the Left component).
       */
      encryptLeft: (input: PlainText): CipherText => encryptNumLeft(cipher, input)
    }
  },

  /*
   * Compare two cipher texts returning -1 if a < b, 0 if a === b, and 1 if a > b.
   * Throws if the inputs are not comparable.
   */
  compare: (a: CipherText, b: CipherText): any => { // TODO: Enum integer type
    return compare(a, b);
  }
};

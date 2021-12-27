"use strict";

/* Importing the rust compiled lib (index.node) doesn't work and so we use require here */
const {
  initCipher,
  encrypt_buf,
  encrypt_num,
  compare
} = require("../index.node");

export type Key = Buffer;
export type PlainText = number | bigint
export type CipherText = Buffer;

export type ORECipher = {
  encrypt: (input: PlainText) => CipherText
}


// TODO: make encrypt return a promise using promisify?
// TODO: Add tests!
export const ORE = {
  init: (k1: Key, k2: Key): ORECipher => {
    let cipher = initCipher(k1, k2);
    return {
      encrypt: (input: PlainText) => {
        if (typeof input === 'bigint') {
          // Neon doesn't support Bigint so we do this here
          let buf = Buffer.allocUnsafe(8);
          buf.writeBigUInt64BE(input);
          return encrypt_buf(cipher, buf);
        } else {
          return encrypt_num(cipher, input);
        }
      }
    }
  },

  compare: (a: CipherText, b: CipherText): any => { // TODO: Enum integer type
    return compare(a, b);
  }
};


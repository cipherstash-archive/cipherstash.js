"use strict";

/* Importing the rust compiled lib (index.node) doesn't work and so we use require here */
const {
  initCipher,
  encrypt_buf,
  encrypt_num,
  encrypt_buf_left,
  encrypt_num_left,
  compare
} = require("../index.node");

export type Key = Buffer;
export type PlainText = number | bigint | Buffer
export type CipherText = Buffer;

export type ORECipher = {
  encrypt: (input: PlainText) => CipherText,
  encryptLeft: (input: PlainText) => CipherText
}

// TODO: make encrypt return a promise using promisify?
export const ORE = {
  init: (k1: Key, k2: Key): ORECipher => {
    let cipher = initCipher(k1, k2);
    return {
      encrypt: (input: PlainText): CipherText => {
        if (typeof input === 'bigint') {
          // Neon doesn't support Bigint so we do this here
          let buf = Buffer.allocUnsafe(8);
          buf.writeBigUInt64BE(input);
          return encrypt_buf(cipher, buf);
        } else if (input instanceof Buffer) {
          return encrypt_buf(cipher, input);
        } else {
          return encrypt_num(cipher, input);
        }
      },

      encryptLeft: (input: PlainText): CipherText => {
        if (typeof input === 'bigint') {
          // Neon doesn't support Bigint so we do this here
          let buf = Buffer.allocUnsafe(8);
          buf.writeBigUInt64BE(input);
          return encrypt_buf_left(cipher, buf);
        } else if (input instanceof Buffer) {
          return encrypt_buf_left(cipher, input);
        } else {
          return encrypt_num_left(cipher, input);
        }
      }
    }
  },

  compare: (a: CipherText, b: CipherText): any => { // TODO: Enum integer type
    return compare(a, b);
  }
};

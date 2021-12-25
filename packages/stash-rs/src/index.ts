"use strict";

/* Importing the rust compiled lib (index.node) doesn't work and so we use require here */
const { initCipher, encrypt } = require("../index.node");

export type Key = Buffer;
export type Plaintext = Buffer;
export type CipherText = Buffer;

export type ORECipher = {
  encrypt: (input: Plaintext) => CipherText
}

// TODO: make encrypt return a promise using promisify?
// TODO: Add tests!
export const ORE = {
  init: (k1: Key, k2: Key): ORECipher => {
    let cipher = initCipher(k1, k2);
    return {
      encrypt: (buf) => {
        return encrypt(cipher, buf)
      }
    }
  }
};


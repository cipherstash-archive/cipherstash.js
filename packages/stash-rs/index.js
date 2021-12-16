"use strict";

const { initCipher, encrypt } = require("./index.node");

// TODO: make encrypt return a promise using promisify?
// TODO: Add tests!
const ORE = {
  init: (k1, k2) => {
    let cipher = initCipher(k1, k2);
    return {
      encrypt: (buf) => {
        return encrypt(cipher, buf)
      }
    }
  }
};

module.exports = ORE;

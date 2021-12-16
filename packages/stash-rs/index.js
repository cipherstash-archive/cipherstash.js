"use strict";

const { initCipher, encrypt } = require("./index.node");

const ORE = {
  init: (k1, k2) => { // TODO: Pass keys and seed as args
    let cipher = initCipher(k1, k2);
    return {
      encrypt: (buf) => {
        return encrypt(cipher, buf)
      }
    }
  }
};

module.exports = ORE;

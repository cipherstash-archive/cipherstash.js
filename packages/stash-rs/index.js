"use strict";

const { initCipher, encrypt } = require("./index.node");

const ORE = {
  init: () => { // TODO: Pass keys and seed as args
    let cipher = initCipher();
    return {
      encrypt: (buf) => {
        return encrypt(cipher, buf)
      }
    }
  }
};

module.exports = ORE;

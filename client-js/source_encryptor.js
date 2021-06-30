

// TODO: Later on custom versions of these functions could be used
// to implement special behavour. For example, a DocumentEncryptor could
// return only a secure hashed ID for the doc and instead store the encrypted data
// in an existing database

const SourceEncryptor = async (plaintext, cipherSuite) => {
  return cipherSuite.encrypt(plaintext).then(({ result }) => { return result })
}

const SourceDecryptor = async (cipherText, cipherSuite) => {
  if (cipherText instanceof Array) {
    // TODO: Use a decryptAll function instead
    const decryptors = cipherText.map(async (ct) => {
      return await cipherSuite.decrypt(ct)
    })
    return Promise.all(decryptors)
  } else {
    return await cipherSuite.decrypt(cipherText)
  }
}


module.exports = {
  SourceEncryptor,
  SourceDecryptor
}

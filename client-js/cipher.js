
const BSON = require('bson')
const { Binary } = require('bson')
const {
  KmsKeyringNode,
  buildClient,
  CommitmentPolicy,
  NodeCachingMaterialsManager,
  getLocalCryptographicMaterialsCache,
} = require('@aws-crypto/client-node')

// TODO: Read https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/concepts.html#key-commitment

const { encrypt: NodeEncrypt, decrypt: NodeDecrypt } = buildClient(
  CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT
)

const cacheCapacity = 1000
const cache = getLocalCryptographicMaterialsCache(cacheCapacity)

/* maxAge is the time in milliseconds that an entry will be cached.
 * Elements are actively removed from the cache.
 */
const maxAge = 1000 * 30

/* The maximum amount of bytes that will be encrypted under a single data key.
 * This value is optional,
 * but you should configure the lowest value possible.
 */
const maxBytesEncrypted = 100*1000

/* The maximum number of messages that will be encrypted under a single data key.
 * This value is optional,
 * but you should configure the lowest value possible.
 */
const maxMessagesEncrypted = 1000

const partition = "source"

class CipherSuite {
  #context = null
  #cmm = null

  constructor(generatorKeyId) {
    const keyring = new KmsKeyringNode({ generatorKeyId })
    this.#context = {
      version: "0.1",
      format: "BSON"
    }
    this.#cmm = new NodeCachingMaterialsManager({
      backingMaterials: keyring,
      cache,
      maxAge,
      maxBytesEncrypted,
      partition,
      maxMessagesEncrypted,
    })
  }

  async encrypt(record) {
    const plaintext = BSON.serialize(record)
    return NodeEncrypt(this.#cmm, plaintext, {
      encryptionContext: this.#context,
      plaintextLength: plaintext.length
    })
  }

  async decrypt(ciphertext) {
    const { plaintext } = await NodeDecrypt(this.#cmm, ciphertext)
    const result = convertBinariesToBuffers(BSON.deserialize(plaintext))
    return result
  }
}

// BSON has a "Binary" datatype for representing binary data.  It's a thin
// wrapper over a regular Buffer, which is what the rest of the code expects, so
// here we convert them to Buffer objects.
function convertBinariesToBuffers(plaintext) {
  if (Array.isArray(plaintext)) {
    return plaintext.map(pt => convertBinariesToBuffers(pt))
  } else if (plaintext instanceof Object) {
    return objectMap(plaintext, (value) => {
      if (value instanceof Binary) {
        return value.value(true)
      } else {
        return convertBinariesToBuffers(value)
      }
    }) 
  } else {
    return plaintext
  }
}

function objectMap(object, mapFn) {
  return Object.keys(object).reduce((result, key) =>
    Object.assign(result, {[key]: mapFn(object[key])}) , {})
}

module.exports = CipherSuite

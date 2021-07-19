import {
  KmsKeyringNode,
  buildClient,
  CommitmentPolicy,
  NodeCachingMaterialsManager,
  getLocalCryptographicMaterialsCache,
} from '@aws-crypto/client-node'
import { deserialize, serialize } from '../serializer'

// TODO: Read https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/concepts.html#key-commitment

const client = buildClient(
  CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT
)

type ThenArg<T> = T extends PromiseLike<infer U> ? U : never
// This could be considered a bit hacky. The AWS SDK does not export the
// EncryptOutput type even though it exports functions that return it. We return
// this type ourselves but TS to the rescue.
//
// TODO: submit patch to export the EncryptOutput type (or figure out why it's
// not exported).  Also publish the info on how to work around it (see below)
type EncryptOutput = ThenArg<ReturnType<ReturnType<typeof buildClient>['encrypt']>>

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

export type CipherSuite = {
  encrypt: <T>(plaintext: T) => Promise<EncryptOutput>
  decrypt: <T>(ciphertext: Buffer) => Promise<T>
}

export function makeCipherSuite(generatorKeyId: string): CipherSuite {
  const keyring = new KmsKeyringNode({ generatorKeyId })
  const context = {
    version: "0.1",
    format: "BSON"
  }
  const cmm = new NodeCachingMaterialsManager({
    backingMaterials: keyring,
    cache,
    maxAge,
    maxBytesEncrypted,
    partition,
    maxMessagesEncrypted,
  })

  return {
    encrypt: async <T>(plaintext: T) => {
      const buffer = serialize(plaintext)
      return client.encrypt(cmm, buffer, {
        encryptionContext: context,
        plaintextLength: buffer.byteLength
      })
    },

    decrypt: async <T>(ciphertext: Buffer) => {
      const decrypted = await client.decrypt(cmm, ciphertext)
      return deserialize(decrypted.plaintext) as T
    }
  }
}



import { V1 } from '@cipherstash/stashjs-grpc'

import { CipherSuite, makeCipherSuite } from './crypto/cipher'
import { CollectionSchema } from './collection-schema'
import { AuthToken } from './auth-token'
import { Mappings, MappingsMeta, StashRecord } from './dsl/mappings-dsl'

import { Collection } from './collection'
import { idBufferToString, idStringToBuffer, makeRef, refBufferToString } from './utils'
import { loadConfigFromEnv, StashConfig } from './stash-config'

/**
 * Represents an authenticated session to a CipherStash instance.
 *
 * Provides methods for creating, loading and deleting collections.
 *
 * TODO: extract the GRPC-message-munging code into helpers in the `src/grpc`
 * directory.
 */
export class Stash {
  readonly cipherSuite: CipherSuite
  readonly stub: V1.APIClient
  readonly clusterId: string
  readonly #authToken: AuthToken

  private constructor(
    stub: V1.APIClient,
    clusterId: string,
    authToken: AuthToken,
    cmk: string
  ) {
    this.stub = stub
    this.cipherSuite = makeCipherSuite(cmk)
    this.clusterId = clusterId
    this.#authToken = authToken
  }

  public static loadConfigFromEnv(): StashConfig {
    return loadConfigFromEnv()
  }

  public static async connect(config: StashConfig): Promise<Stash> {
    const authToken = new AuthToken(config.idpHost, config.clientCredentials, config.federationConfig)
    try {
      await authToken.getToken(config.clusterId)
      return new Stash(V1.connect(config.serviceFqdn), config.clusterId, authToken, config.cmk)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  public close(): void {
    this.stub.close()
  }

  public async createCollection<
    R extends StashRecord,
    M extends Mappings<R>,
    MM extends MappingsMeta<M>
  >(
    definition: CollectionSchema<R, M, MM>
  ): Promise<Collection<R, M, MM>> {

    return new Promise(async (resolve, reject) => {
      const request: V1.CreateRequestInput = {
        context: { authToken: await this.refreshToken() },
        ref: await makeRef(definition.name, this.clusterId),
        indexes: await this.encryptMappings(definition)
      }

      this.stub.createCollection(request, async (err, res) => {
        if (err) { reject(err) }
        resolve(await this.unpackCollection<R, M, MM>(definition.name, res!))
      })
    })
  }

  public async loadCollection<
    R extends StashRecord,
    M extends Mappings<R>,
    MM extends MappingsMeta<M>
  >(
    definition: CollectionSchema<R, M, MM>
  ): Promise<Collection<R, M, MM>> {
    return new Promise(async (resolve, reject) => {
      const ref = await makeRef(definition.name, this.clusterId)
      this.stub.collectionInfo({
        context: { authToken: await this.refreshToken() },
        ref
      }, async (err, res) => {
        if (err) { reject(err) }
        resolve(await this.unpackCollection<R, M, MM>(definition.name, res!))
      })
    })
  }

  public deleteCollection(
    collectionName: string
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const ref = await makeRef(collectionName, this.clusterId)
      this.stub.deleteCollection({
        context: { authToken: await this.refreshToken() },
        ref
      }, async (err, _res) => {
        if (err) { reject(err) }
        resolve(undefined)
      })
    })
  }

  private async unpackCollection<
    R extends StashRecord,
    M extends Mappings<R>,
    MM extends MappingsMeta<M>
  >(
    collectionName: string,
    infoReply: V1.InfoReplyOutput
  ): Promise<Collection<R, M, MM>> {
    const { id, indexes: encryptedMappings } = infoReply
    const storedMappings = await this.decryptMappings(encryptedMappings!)

    // TODO verify the collection has the mappings that the user expects - they should be deep equal

    const mappings: M = Object.fromEntries(storedMappings.map(sm => [sm.meta.$indexName, sm.mapping]))
    const meta: MM = Object.fromEntries(storedMappings.map(sm => {
      return [sm.meta.$indexName, {
        ...sm.meta,
        $prf: Buffer.from(sm.meta.$prf, 'hex'),
        $prp: Buffer.from(sm.meta.$prp, 'hex'),
      }]
    }))

    return Promise.resolve(
      new Collection<R, M, MM>(
        this,
        idBufferToString(id!),
        refBufferToString(infoReply.ref!),
        new CollectionSchema(collectionName, mappings, meta)
      )
    )
  }

  private async decryptMappings(
    encryptedMappings: V1.IndexOutput[]
  ): Promise<Array<StoredMapping>> {

    const storedMappings = await Promise.all(encryptedMappings.map(async ({ settings, id: indexId }) => {
      const { mapping, meta } = await this.cipherSuite.decrypt(settings!)
      return {
        mapping,
        meta: {
          ...meta,
          $indexId: idBufferToString(indexId),
          $prf: Buffer.from(meta!.$prf, 'hex'),
          $prp: Buffer.from(meta!.$prp, 'hex'),
        }
      }
    })) as Array<StoredMapping>

    return storedMappings
  }

  private async encryptMappings<
    R extends StashRecord,
    M extends Mappings<R>,
    MM extends MappingsMeta<M>
  >(
    definition: CollectionSchema<R, M, MM>
  ): Promise<Array<V1.IndexInput>> {

    const encryptedIndexes = await Promise.all(Object.entries(definition.mappings).map(async ([indexName, mapping]) => {
      const storedMapping: StoredMapping = {
        mapping,
        meta: {
          ...definition.meta[indexName]!,
          $prf: definition.meta[indexName]!.$prf.toString('hex'),
          $prp: definition.meta[indexName]!.$prp.toString('hex'),
        }
      }

      const { result } = await this.cipherSuite.encrypt(storedMapping)
      return {
        id: idStringToBuffer(storedMapping.meta.$indexId),
        settings: result
      }
    }))

    return encryptedIndexes
  }

  public async refreshToken(): Promise<string> {
    return await this.#authToken.getToken(this.clusterId)
  }
}

type StoredMapping = {
  mapping: any
  meta: any
}

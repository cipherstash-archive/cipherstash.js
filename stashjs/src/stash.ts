import { V1 } from '@cipherstash/stashjs-grpc'

import { CipherSuite, makeCipherSuite } from './crypto/cipher'
import { CollectionSchema } from './collection-schema'
import { AuthStrategy } from './auth/auth-strategy'
import { ViaClientCredentials } from './auth/via-client-credentials'
import { ViaStoredToken } from './auth/via-stored-token'
import { Mappings, MappingsMeta, StashRecord } from './dsl/mappings-dsl'

import { Collection } from './collection'
import { idBufferToString, idStringToBuffer, makeRef, refBufferToString } from './utils'
import { loadConfigFromEnv, StashConfig } from './stash-config'

import { grpcMetadata } from './auth/grpc-metadata'

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

  private constructor(
    public readonly stub: V1.APIClient,
    public readonly clusterId: string,
    public readonly authStrategy: AuthStrategy,
    public readonly cmk: string
  ) {
    this.cipherSuite = makeCipherSuite(cmk)
    this.clusterId = clusterId
    this.cmk = cmk
  }

  public static loadConfigFromEnv(): StashConfig {
    return loadConfigFromEnv()
  }

  public static async connect(config: StashConfig): Promise<Stash> {
    try {
      const authStrategy = Stash.makeAuthStrategy(config)
      await authStrategy.initialise()
      return new Stash(V1.connect(config.serviceFqdn), config.clusterId, authStrategy, config.cmk)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  private static makeAuthStrategy(config: StashConfig): AuthStrategy {
    switch (config.authenticationConfig.kind) {
      case "client-credentials": return new ViaClientCredentials(
        config.idpHost,
        config.authenticationConfig,
        config.clusterId,
        config.federationConfig
      )

      case "stored-access-token": return new ViaStoredToken(
        config.authenticationConfig.clientId,
        config.idpHost,
        config.federationConfig,
      )
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
    schema: CollectionSchema<R, M, MM>
  ): Promise<Collection<R, M, MM>> {
    return this.authStrategy.authenticatedRequest((authToken: string) =>
      new Promise(async (resolve, reject) => {
        const request: V1.CreateRequestInput = {
          ref: await makeRef(schema.name, this.clusterId),
          indexes: await this.encryptMappings(schema)
        }

        this.stub.createCollection(request, grpcMetadata(authToken), async (err, res) => {
          if (err) {
            reject(err)
            return
          }
          this.unpackCollection<R, M, MM>(schema.name, res!).then(resolve, reject)
        })
      })
    )
  }

  public async loadCollection<
    R extends StashRecord,
    M extends Mappings<R>,
    MM extends MappingsMeta<M>
  >(
    definition: CollectionSchema<R, M, MM>
  ): Promise<Collection<R, M, MM>> {
    return this.authStrategy.authenticatedRequest((authToken: string) =>
      new Promise(async (resolve, reject) => {
        const ref = await makeRef(definition.name, this.clusterId)
        this.stub.collectionInfo({
          ref
        }, grpcMetadata(authToken), async (err, res) => {
          if (err) {
            reject(err)
          } else {
            this.unpackCollection<R, M, MM>(definition.name, res!).then(resolve, reject)
          }
        })
      })
    )
  }

  public deleteCollection(
    collectionName: string
  ): Promise<void> {
    return this.authStrategy.authenticatedRequest((authToken: string) =>
      new Promise(async (resolve, reject) => {
        const ref = await makeRef(collectionName, this.clusterId)
        this.stub.deleteCollection({
          ref
        }, grpcMetadata(authToken), async (err, _res) => {
          if (err) { reject(err) }
          resolve(undefined)
        })
      })
    )
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
}

type StoredMapping = {
  mapping: any
  meta: any
}

import { V1 } from '@cipherstash/stashjs-grpc'

import { CipherSuite, makeCipherSuite, MakeRefFn } from './crypto/cipher'
import { CollectionSchema } from './collection-schema'
import { AuthStrategy } from './auth/auth-strategy'
import { Auth0Machine2Machine } from './auth/auth0-machine-2-machine'
import { Auth0DeviceToken } from './auth/auth0-device-token'
import { Mappings, MappingsMeta, StashRecord } from './dsl/mappings-dsl'

import { Collection } from './collection'
import { idBufferToString, idStringToBuffer, refBufferToString } from './utils'
import { loadConfigFromEnv, StashProfile } from './stash-profile'

import { grpcMetadata } from './auth/grpc-metadata'
import { CollectionMetadata, configStore } from '.'

import { makeRefGenerator } from './crypto/cipher'
import { KMS } from '@aws-sdk/client-kms'

export type LoadConfigOptions = Readonly<{
  profileName?: string
}>

/**
 * Represents an authenticated session to a CipherStash instance.
 *
 * Provides methods for creating, loading and deleting collections.
 *
 * TODO: extract the GRPC-message-munging code into helpers in the `src/grpc`
 * directory.
 */
export class Stash {
  readonly sourceDataCipherSuite: CipherSuite

  private constructor(
    public readonly stub: V1.APIClient,
    public readonly authStrategy: AuthStrategy,
    public readonly config: StashProfile,
    private readonly makeRef: MakeRefFn
  ) {
    this.sourceDataCipherSuite = makeCipherSuite(config.keyManagement.key.cmk)
  }

  public static async loadConfig(opts?: LoadConfigOptions): Promise<StashProfile> {
    const profile = opts?.profileName
      ? await configStore.loadProfile(opts.profileName)
      : await configStore.loadDefaultProfile()

    return profile
  }

  public static loadConfigFromEnv(): StashProfile {
    return loadConfigFromEnv()
  }

  public static async connect(profile?: StashProfile): Promise<Stash> {
    profile ||= await Stash.loadConfig()
    const authStrategy = await Stash.makeAuthStrategy(profile)
    await authStrategy.initialise()
    return new Stash(
      V1.connect(profile.service.host),
      authStrategy,
      profile,
      await makeRefGenerator(
        new KMS({ region: profile.keyManagement.awsCredentials.region }),
        profile.keyManagement.key.namingKey
      )
    )
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
          ref: this.makeRef(schema.name),
          metadata: await this.encryptCollectionMetadata({ name: schema.name }),
          indexes: await this.encryptMappings(schema)
        }

        this.stub.createCollection(request, grpcMetadata(authToken), async (err: any, res: any) => {
          if (err) {
            reject(err)
          } else {
            this.unpackCollection<R, M, MM>(res!).then(resolve, reject)
          }
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
        const ref = this.makeRef(definition.name)
        this.stub.collectionInfo({
          ref
        }, grpcMetadata(authToken), async (err: any, res: any) => {
          if (err) {
            reject(err)
          } else {
            this.unpackCollection<R, M, MM>(res!).then(resolve, reject)
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
        const ref = this.makeRef(collectionName)
        this.stub.deleteCollection({
          ref
        }, grpcMetadata(authToken), async (err: any, _res: any) => {
          if (err) {
            reject(err)
          } else {
            resolve(undefined)
          }
        })
      })
    )
  }

  private async unpackCollection<
    R extends StashRecord,
    M extends Mappings<R>,
    MM extends MappingsMeta<M>
  >(
    infoReply: V1.InfoReplyOutput
  ): Promise<Collection<R, M, MM>> {
    const { id, indexes: encryptedMappings, metadata } = infoReply
    const collectionMeta = await this.decryptCollectionMetadata(metadata)
    const storedMappings = await this.decryptMappings(encryptedMappings!)

    // TODO verify the collection has the mappings that the user expects - they should be deep equal
    const mappings: M = Object.fromEntries(storedMappings.map(sm => [sm.meta.$indexName, sm.mapping]))
    const mappingsMeta: MM = Object.fromEntries(storedMappings.map(sm => {
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
        new CollectionSchema(collectionMeta.name, mappings, mappingsMeta)
      )
    )
  }

  private async decryptMappings(
    encryptedMappings: V1.IndexOutput[]
  ): Promise<Array<StoredMapping>> {

    const storedMappings = await Promise.all(encryptedMappings.map(async ({ settings, id: indexId }) => {
      const { mapping, meta } = await this.sourceDataCipherSuite.decrypt(settings!)
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

      const { result } = await this.sourceDataCipherSuite.encrypt(storedMapping)
      return {
        id: idStringToBuffer(storedMapping.meta.$indexId),
        settings: result
      }
    }))

    return encryptedIndexes
  }

  private async encryptCollectionMetadata(metadata: CollectionMetadata): Promise<Buffer> {
    const { result } = await this.sourceDataCipherSuite.encrypt(metadata)
    return result
  }

  private async decryptCollectionMetadata(buffer: Buffer): Promise<CollectionMetadata> {
    return await this.sourceDataCipherSuite.decrypt(buffer)
  }

  private static async makeAuthStrategy(profile: StashProfile): Promise<AuthStrategy> {
    switch (profile.identityProvider.kind) {
      case "Auth0-DeviceCode": return new Auth0DeviceToken(profile, await configStore.loadProfileAuthInfo(profile.service.workspace))
      case "Auth0-Machine2Machine": return new Auth0Machine2Machine(profile)
    }
  }
}

type StoredMapping = {
  mapping: any
  meta: any
}

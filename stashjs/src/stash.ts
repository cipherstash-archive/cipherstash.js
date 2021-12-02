import { V1 } from '@cipherstash/stashjs-grpc'

import { CipherSuite, makeCipherSuite, makeNodeCachingMaterialsManager, MakeRefFn } from './crypto/cipher'
import { CollectionSchema } from './collection-schema'
import { AuthStrategy, Memo, withFreshCredentials } from './auth/auth-strategy'
import { Mappings, MappingsMeta, StashRecord } from './dsl/mappings-dsl'
import { makeAuthStrategy } from './auth/make-auth-strategy'

import { Collection } from './collection'
import { idBufferToString, idStringToBuffer, refBufferToString } from './utils'
import { loadProfileFromEnv } from './stash-config'

import { grpcMetadata } from './auth/grpc-metadata'
import { CollectionMetadata, profileStore } from '.'

import { makeRefGenerator } from './crypto/cipher'
import { KMS } from '@aws-sdk/client-kms'
import { StashProfile } from './stash-profile'

export type ProfileOptions = Readonly<{
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
  public sourceDataCipherSuiteMemo: Memo<CipherSuite>

  private constructor(
    public readonly stub: V1.APIClient,
    public readonly authStrategy: AuthStrategy,
    public readonly profile: StashProfile,
    private readonly makeRef: MakeRefFn
  ) {
    this.sourceDataCipherSuiteMemo = withFreshCredentials<CipherSuite>(this.authStrategy, ({ awsConfig }) => {
      return Promise.resolve(makeCipherSuite(
        makeNodeCachingMaterialsManager(
          this.profile.config.keyManagement.key.arn,
          awsConfig
        )
      ))
    })
  }

  public static async loadProfile(opts?: ProfileOptions): Promise<StashProfile> {
    const profile = opts?.profileName
      ? await profileStore.loadProfile(opts.profileName)
      : await profileStore.loadDefaultProfile()

    return profile
  }

  public static loadProfileFromEnv(): StashProfile {
    return loadProfileFromEnv()
  }

  public static async connect(maybeProfile?: StashProfile): Promise<Stash> {
    const profile: StashProfile = maybeProfile || await Stash.loadProfile()
    const authStrategy = makeAuthStrategy(profile)
    await authStrategy.initialise()
    return await authStrategy.withAuthentication<Stash>(async ({awsConfig}) =>
      new Stash(
        V1.connect(profile.config.service.host, profile.config.service.port),
        authStrategy,
        profile,
        await makeRefGenerator(
          new KMS(awsConfig),
          profile.config.keyManagement.key.namingKey
        )
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
    return this.authStrategy.withAuthentication(({ authToken }) =>
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
    schemaOrName: CollectionSchema<R, M, MM> | string
  ): Promise<Collection<R, M, MM>> {
    return this.authStrategy.withAuthentication(({ authToken }) =>
      new Promise(async (resolve, reject) => {
        const name = schemaOrName instanceof CollectionSchema ? schemaOrName.name : schemaOrName
        this.stub.collectionInfo({
          ref: this.makeRef(name)
        }, grpcMetadata(authToken), async (err: any, res) => {
          if (err) {
            reject(err)
          } else {
            this.unpackCollection<R, M, MM>(res!).then(resolve, reject)
          }
        })
      })
    )
  }

  public async listCollections(): Promise<Array<string>> {
    return this.authStrategy.withAuthentication(({authToken}) =>
      new Promise(async (resolve, reject) => {
        this.stub.collectionList({}, grpcMetadata(authToken), async (err: any, res?: V1.ListReply) => {
          if (err) {
            reject(err)
          } else if (res) {
            const collectionMetas: Array<CollectionMetadata> = await Promise.all(res.collections.map(async (info: V1.InfoReplyOutput) =>
              (await this.sourceDataCipherSuiteMemo.freshValue()).decrypt<CollectionMetadata>(info.metadata)
            ))
            resolve(collectionMetas.map(c => c.name))
          } else {
            reject("Undefined response")
          }
        })
      })
    )
  }

  public deleteCollection(
    collectionName: string
  ): Promise<void> {
    return this.authStrategy.withAuthentication(({ authToken }) =>
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
      const { mapping, meta } = await (await this.sourceDataCipherSuiteMemo.freshValue()).decrypt(settings!)
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

      const { result } = await (await this.sourceDataCipherSuiteMemo.freshValue()).encrypt(storedMapping)
      return {
        id: idStringToBuffer(storedMapping.meta.$indexId),
        settings: result
      }
    }))

    return encryptedIndexes
  }

  private async encryptCollectionMetadata(metadata: CollectionMetadata): Promise<Buffer> {
    const { result } = await (await this.sourceDataCipherSuiteMemo.freshValue()).encrypt(metadata)
    return result
  }

  private async decryptCollectionMetadata(buffer: Buffer): Promise<CollectionMetadata> {
    return await (await this.sourceDataCipherSuiteMemo.freshValue()).decrypt(buffer)
  }
}

type StoredMapping = {
  mapping: any
  meta: any
}

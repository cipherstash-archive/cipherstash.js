import { V1 } from '@cipherstash/stashjs-grpc'

import { CipherSuite, makeCipherSuite, makeNodeCachingMaterialsManager, MakeRefFn } from './crypto/cipher'
import { CollectionSchema } from './collection-schema'
import { Memo } from './auth/auth-strategy'
import { Mappings, MappingsMeta, StashRecord } from './dsl/mappings-dsl'
import { CollectionInternal, CollectionMetadata } from './collection-internal'
import { idBufferToString, normalizeId, refBufferToString } from './utils'
import { loadProfileFromEnv } from './stash-config'
import { makeRefGenerator } from './crypto/cipher'
import { KMS } from '@aws-sdk/client-kms'
import { StashProfile } from './stash-profile'
import { profileStore } from './auth/profile-store'
import { AsyncResult, sequence, gather, Err, Ok, Unit, convertErrorsTo, parallel, toAsync, gatherTuple2, convertAsyncErrorsTo } from './result'
import { CollectionCreationFailure, ConnectionFailure, DecryptionFailure, AuthenticationFailure, EncryptionFailure, CollectionLoadFailure, CollectionListFailure, CollectionDeleteFailure, LoadProfileFailure } from './errors'

import { makeAsyncResultApiWrapper } from './stash-api-async-result-wrapper'
import { getUserAgent } from './user-agent'
import { logger } from './logger';

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
export class StashInternal {
  public sourceDataCipherSuiteMemo: Memo<CipherSuite>

  private constructor(
    public readonly stub: V1.APIClient,
    public readonly api: ReturnType<typeof makeAsyncResultApiWrapper>,
    public readonly profile: StashProfile,
    private readonly makeRef: MakeRefFn
  ) {
    this.sourceDataCipherSuiteMemo = profile.withFreshKMSCredentials<CipherSuite>(async (awsConfig) => {
      return Ok.Async(makeCipherSuite(
        makeNodeCachingMaterialsManager(
          this.profile.config.keyManagement.key.arn,
          awsConfig
        )
      ))
    })
  }

  public static async loadProfile(opts?: ProfileOptions): AsyncResult<StashProfile, LoadProfileFailure> {
    if (opts?.profileName) {
      logger.debug(`Loading profile using provided profileName: ${opts?.profileName}`);
      return await profileStore.loadProfile(opts.profileName)
    } else if (process.env['CS_PROFILE_NAME']) {
      logger.debug(`Loading profile using CS_PROFILE_NAME env var: ${process.env['CS_PROFILE_NAME']}`);
      return await profileStore.loadProfile(process.env['CS_PROFILE_NAME']);
    } else {
      logger.debug("Loading profile using default profile config");
      return profileStore.loadDefaultProfile();
    }
  }

  public static loadProfileFromEnv(): StashProfile {
    return loadProfileFromEnv()
  }

  public static async connect(maybeProfile?: StashProfile): AsyncResult<StashInternal, ConnectionFailure> {
    const profile = (maybeProfile && Ok(maybeProfile)) || await StashInternal.loadProfile()
    if (!profile.ok) {
      return Err(ConnectionFailure(profile.error))
    }
    const refGenerator = await profile.value.withFreshKMSCredentials<MakeRefFn>(async (awsConfig) => {
      const result = await makeRefGenerator(
        new KMS(awsConfig),
        profile.value.config.keyManagement.key.namingKey
      )
      if (result.ok) {
        return Ok(result.value)
      } else {
        return Err(AuthenticationFailure(result.error))
      }
    }).freshValue()

    if (refGenerator.ok) {
      const stub = V1.connect(profile.value.config.service.host, profile.value.config.service.port, {
        userAgent: getUserAgent()
      })

      return Ok(
        new StashInternal(
          stub,
          makeAsyncResultApiWrapper(stub, profile.value),
          profile.value,
          refGenerator.value
        )
      )
    } else {
      return Err(ConnectionFailure(refGenerator.error))
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
  ): AsyncResult<CollectionInternal<R, M, MM>, CollectionCreationFailure> {
    return convertErrorsTo(
      CollectionCreationFailure,
      await sequence(
        parallel(
          _ => this.encryptCollectionMetadata({ name: schema.name }),
          _ => this.encryptMappings(schema)
        ),
        ([_, metadata, mappings]) => Ok.Async({ ref: this.makeRef(schema.name), metadata, indexes: mappings }),
        request => this.api.collection.create(request),
        res => this.unpackCollection<R, M, MM>(res!)
      )(Unit)
    )
  }

  public async loadCollection<
    R extends StashRecord,
    M extends Mappings<R> = Mappings<R>,
    MM extends MappingsMeta<M> = MappingsMeta<M>
  >(
    schemaOrName: CollectionSchema<R, M, MM> | string
  ): AsyncResult<CollectionInternal<R, M, MM>, CollectionLoadFailure> {
    const name = schemaOrName instanceof CollectionSchema ? schemaOrName.name : schemaOrName
    return convertErrorsTo(
      CollectionLoadFailure,
      await sequence(
        _ => this.api.collection.info({ ref: this.makeRef(name) }),
        apiResults => this.unpackCollection<R, M, MM>(apiResults!)
      )(Unit)
    )
  }

  public async listCollections(): AsyncResult<Array<string>, CollectionListFailure> {
    return convertErrorsTo(
      CollectionListFailure,
      await sequence(
        _ => this.api.collection.list({}),
        apiResults => this.decryptResponses(apiResults!),
        decrypted => Ok.Async(decrypted.map(collectionMetadata => collectionMetadata.name))
      )(Unit)
    )
  }

  public async deleteCollection(collectionName: string): AsyncResult<void, CollectionDeleteFailure> {
    return convertErrorsTo(
      CollectionDeleteFailure(collectionName),
      await sequence(
        _ => this.api.collection.delete({ ref: this.makeRef(collectionName) }),
        _ => Ok.Async(void 0)
      )(Unit)
    )
  }

  private async unpackCollection<
    R extends StashRecord,
    M extends Mappings<R>,
    MM extends MappingsMeta<M>
  >(
    infoReply: V1.Collection.InfoReply
  ): AsyncResult<CollectionInternal<R, M, MM>, DecryptionFailure> {
    const { id, metadata, indexes: encryptedMappings } = infoReply

    return await sequence(
      parallel(
        _ => this.decryptCollectionMetadata(metadata!),
        _ => this.decryptMappings(encryptedMappings!)
      ),
      ([_, collectionMeta, storedMappings]) =>
        Ok.Async([
          collectionMeta,
          this.deserializeMappings<M>(storedMappings),
          this.deserializeMappingsMeta<MM>(storedMappings)
        ] as const)
      ,
      ([collectionMeta, mappings, mappingsMeta]) => Ok.Async(
        new CollectionInternal<R, M, MM>(
          this,
          idBufferToString(id!),
          refBufferToString(infoReply.ref!),
          new CollectionSchema(collectionMeta.name, mappings, mappingsMeta)
        )
      )
    )(Unit)
  }

  private deserializeMappings<M>(storedMappings: Array<StoredMapping>): M {
    return Object.fromEntries(storedMappings.map(sm => [sm.meta.$indexName, sm.mapping]))
  }

  private deserializeMappingsMeta<MM>(storedMappings: Array<StoredMapping>): MM {
    return Object.fromEntries(storedMappings.map(sm => {
      return [sm.meta.$indexName, {
        ...sm.meta,
        $prfKey: Buffer.from(sm.meta.$prfKey, 'hex'),
        $prpKey: Buffer.from(sm.meta.$prpKey, 'hex'),
      }]
    }))
  }

  private async decryptMappings(encryptedMappings: V1.Index.IndexOutput[]): AsyncResult<Array<StoredMapping>, DecryptionFailure> {
    return await sequence(
      _ => convertAsyncErrorsTo(DecryptionFailure, this.sourceDataCipherSuiteMemo.freshValue()),
      async cipher => gather(await Promise.all(encryptedMappings.map(async em => gatherTuple2([await cipher.decrypt<StoredMapping>(em.settings!), Ok(em.id!)])))),
      decrypted => Ok.Async(decrypted.map(([{ mapping, meta }, indexId]) => ({
        mapping,
        meta: {
          ...meta,
          $indexId: idBufferToString(indexId),
          $prfKey: Buffer.from(meta!.$prfKey, 'hex'),
          $prpKey: Buffer.from(meta!.$prpKey, 'hex'),
        }
      })))
    )(Unit)
  }

  private async encryptMappings<
    R extends StashRecord,
    M extends Mappings<R>,
    MM extends MappingsMeta<M>
  >(
    definition: CollectionSchema<R, M, MM>
  ): AsyncResult<Array<V1.Index.Index>, EncryptionFailure> {
    const memo = await this.sourceDataCipherSuiteMemo.freshValue()
    if (memo.ok) {
      const encryptedIndexes = await Promise.all(Object.entries(definition.mappings).map(async ([indexName, mapping]) => {
        const storedMapping: StoredMapping = {
          mapping,
          meta: {
            ...definition.meta[indexName]!,
            $prfKey: definition.meta[indexName]!.$prfKey.toString('hex'),
            $prpKey: definition.meta[indexName]!.$prpKey.toString('hex'),
          }
        }

        const encryption = await memo.value.encrypt(storedMapping)
        if (encryption.ok) {
          const { result } = encryption.value
          return Ok({
            id: normalizeId(storedMapping.meta.$indexId),
            settings: result
          })
        } else {
          return Err(encryption.error)
        }
      }))
      return gather(encryptedIndexes)
    } else {
      return Err(EncryptionFailure(memo.error))
    }
  }

  private async encryptCollectionMetadata(metadata: CollectionMetadata): AsyncResult<Buffer, EncryptionFailure> {
    return convertErrorsTo(
      EncryptionFailure,
      await sequence(
        _ => this.sourceDataCipherSuiteMemo.freshValue(),
        cipher => cipher.encrypt(metadata),
        ({ result }) => Ok.Async(result)
      )(Unit)
    )
  }

  private async decryptCollectionMetadata(buffer: Buffer): AsyncResult<CollectionMetadata, DecryptionFailure> {
    return await sequence(
      _ => convertAsyncErrorsTo(DecryptionFailure, this.sourceDataCipherSuiteMemo.freshValue()),
      cipher => cipher.decrypt<CollectionMetadata>(buffer)
    )(Unit)
  }

  private async decryptResponses(res: V1.Collection.ListReply): AsyncResult<Array<CollectionMetadata>, DecryptionFailure> {
    return await sequence(
      _ => convertAsyncErrorsTo(DecryptionFailure, this.sourceDataCipherSuiteMemo.freshValue()),
      async cipher => Ok(await Promise.all(res.collections!.map((info) => cipher.decrypt<CollectionMetadata>(info!.metadata!)))),
      decryptions => toAsync(gather(decryptions))
    )(Unit)
  }
}

type StoredMapping = {
  mapping: any
  meta: any
}

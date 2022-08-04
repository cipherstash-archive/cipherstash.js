import { parentPort, workerData, isMainThread } from "worker_threads"
import { CipherSuite, makeCipherSuite, makeNodeCachingMaterialsManager } from "./crypto/cipher"
import { CollectionSchema } from "./collection-schema"
import { AnalysisConfig, AnalysisResult } from "./analysis-runner"
import { Mappings, MappingsMeta, StashRecord } from "./dsl/mappings-dsl"
import { idBufferToString, maybeGenerateId } from "./utils"
import { Memo } from "./auth/auth-strategy"
import { AsyncResult, Err, Ok } from "./result"
import { AnalysisFailure } from "./errors"
import { StashProfile } from "./stash-profile"
import { logger } from "./logger"
import { RecordIndexer } from "@cipherstash/stash-rs"
import { createRecordIndexer } from "./analyzer"

if (!isMainThread) {
  const recordIndexerCache: { [collectionName: string]: RecordIndexer } = {}
  let cipherMemo: Memo<CipherSuite>

  async function performAnalysis(
    config: AnalysisConfig,
    record: StashRecord
  ): AsyncResult<AnalysisResult, AnalysisFailure> {
    if (!cipherMemo) {
      const profile = new StashProfile(config.profile.name, config.profile.config)
      cipherMemo = profile.withFreshKMSCredentials<CipherSuite>(async awsConfig => {
        return Ok.Async(
          makeCipherSuite(makeNodeCachingMaterialsManager(config.profile.config.keyManagement.key.arn, awsConfig))
        )
      })
    }

    const recordWithId = maybeGenerateId(record)
    const indexer = getRecordIndexer(config.schema)
    const vectors = indexer.encryptRecord(recordWithId)

    const cipher = await cipherMemo.freshValue()
    if (cipher.ok) {
      // Store the record uuid as a string so users don't need to convert it
      const encryptedSource = await cipher.value.encrypt({ ...recordWithId, id: idBufferToString(recordWithId.id) })
      if (encryptedSource.ok) {
        const result = {
          docId: recordWithId.id,
          vectors,
          encryptedSource: encryptedSource.value.result,
        }
        return Ok(result)
      } else {
        logger.error(`AnalysisFailure for ${JSON.stringify(record)}: ${JSON.stringify(encryptedSource.error)}`)
        return Err(AnalysisFailure(encryptedSource.error))
      }
    } else {
      logger.error(`cryptoAnalysisFailure for ${JSON.stringify(record)}: ${JSON.stringify(cipher.error)}`)
      return Err(AnalysisFailure(cipher.error))
    }
  }

  function getRecordIndexer<R extends StashRecord, M extends Mappings<R>, MM extends MappingsMeta<M>>(
    schema: CollectionSchema<R, M, MM>
  ): RecordIndexer {
    let indexer = recordIndexerCache[schema.name]
    if (indexer) {
      return indexer
    } else {
      indexer = createRecordIndexer(schema)
      recordIndexerCache[schema.name] = indexer
      return indexer
    }
  }

  parentPort!.on("message", async (record: StashRecord) => {
    const config: AnalysisConfig = workerData.config
    const result = await performAnalysis(config, record)
    if (result.ok) {
      parentPort!.postMessage({ workerId: workerData.workerId, result: result.value })
    } else {
      parentPort!.emit("messageerror", { error: result.error, record })
    }
  })
}

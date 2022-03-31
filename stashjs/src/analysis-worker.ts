import { parentPort, workerData, isMainThread } from "worker_threads"
import { CipherSuite, makeCipherSuite, makeNodeCachingMaterialsManager } from "./crypto/cipher"
import { CollectionSchema } from "./collection-schema"
import { AnalysisConfig, AnalysisResult } from "./analysis-runner"
import { buildRecordAnalyzer, RecordAnalyzer } from "./analyzer"
import { Mappings, MappingsMeta, StashRecord } from "./dsl/mappings-dsl"
import { convertAnalyzedRecordToVectors } from "./grpc/put-helper"
import { maybeGenerateId } from "./utils"
import { Memo } from "./auth/auth-strategy"
import { AsyncResult, Err, Ok } from "./result"
import { AnalysisFailure } from "./errors"
import { StashProfile } from './stash-profile'
import { logger } from './logger';

if (!isMainThread) {
  const recordAnalyzerCache: { [collectionName: string]: any } = {}
  let cipherMemo: Memo<CipherSuite>

  async function performAnalysis(config: AnalysisConfig, record: StashRecord): AsyncResult<AnalysisResult, AnalysisFailure> {
    if (!cipherMemo) {
      const profile = new StashProfile(config.profile.name, config.profile.config)
      cipherMemo = profile.withFreshKMSCredentials<CipherSuite>(async (awsConfig) => {
        return Ok.Async(makeCipherSuite(
          makeNodeCachingMaterialsManager(
            config.profile.config.keyManagement.key.arn,
            awsConfig
          )
        ))
      })
    }

    const analyzer = getRecordAnalyzer(config.schema)
    const recordWithId = maybeGenerateId(record)
    const analyzedRecord = analyzer(recordWithId)
    const vectors = convertAnalyzedRecordToVectors(analyzedRecord)

    const cipher = await cipherMemo.freshValue()
    if (cipher.ok) {
      const encryptedSource = await cipher.value.encrypt(record)
      if (encryptedSource.ok) {
        const result = {
          docId: recordWithId.id,
          vectors,
          encryptedSource: encryptedSource.value.result
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

  function getRecordAnalyzer<
    R extends StashRecord,
    M extends Mappings<R>,
    MM extends MappingsMeta<M>
  >(schema: CollectionSchema<R, M, MM>): RecordAnalyzer<R, M, MM> {
    let analyzer = recordAnalyzerCache[schema.name]
    if (analyzer) {
      return analyzer
    } else {
      analyzer = buildRecordAnalyzer<R, M, MM>(schema)
      recordAnalyzerCache[schema.name] = analyzer
      return analyzer
    }
  }

  parentPort!.on('message', async (record: StashRecord) => {
    const config: AnalysisConfig = workerData.config
    const result = await performAnalysis(config, record)
    if (result.ok) {
      parentPort!.postMessage({ workerId: workerData.workerId, result: result.value })
    } else {
      parentPort!.emit("messageerror", result.error)
    }
  })
}

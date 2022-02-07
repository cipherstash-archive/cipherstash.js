import { parentPort, workerData, isMainThread } from "worker_threads"
import { CipherSuite, makeCipherSuite, makeNodeCachingMaterialsManager } from "./crypto/cipher"
import { CollectionSchema } from "./collection-schema"
import { AnalysisConfig, AnalysisResult } from "./analysis-runner"
import { buildRecordAnalyzer, RecordAnalyzer } from "./analyzer"
import { Mappings, MappingsMeta, StashRecord } from "./dsl/mappings-dsl"
import { convertAnalyzedRecordToVectors } from "./grpc/put-helper"
import { idToBuffer, makeId } from "./utils"
import { makeAuthStrategy } from './auth/make-auth-strategy'
import { Memo, withFreshCredentials } from "./auth/auth-strategy"
import { AsyncResult, Err, Ok } from "./result"
import { AnalysisFailure } from "./errors"

if (!isMainThread) {
  const recordAnalyzerCache: { [collectionName: string]: any } = {}
  let cipherMemo: Memo<CipherSuite>

  async function performAnalyis(config: AnalysisConfig, record: StashRecord): AsyncResult<AnalysisResult, AnalysisFailure> {
    if (!cipherMemo) {
      const authStrategy = await makeAuthStrategy(config.profile)
      await authStrategy.initialise()
      cipherMemo = withFreshCredentials<CipherSuite>(authStrategy, ({ awsConfig }) => {
        return Ok.Async(makeCipherSuite(
          makeNodeCachingMaterialsManager(
            config.profile.config.keyManagement.key.arn,
            awsConfig
          )
        ))
      })
    }

    const analyzer = getRecordAnalyzer(config.schema)
    const analyzedRecord = analyzer(record)
    const vectors = convertAnalyzedRecordToVectors(analyzedRecord)

    const cipher = await cipherMemo.freshValue()
    if (cipher.ok) {
      const encryptedSource = await cipher.value.encrypt(record)
      if (encryptedSource.ok) {
        const result = {
          docId: record.id ? idToBuffer(record.id) : makeId(),
          vectors,
          encryptedSource: encryptedSource.value.result
        }
        return Ok(result)
      } else {
        return Err(AnalysisFailure(encryptedSource.error))
      }
    } else {
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
    const result = await performAnalyis(config, record)
    if (result.ok) {
      parentPort!.postMessage({ workerId: workerData.workerId, result: result.value })
    } else {
      parentPort!.emit("messageerror", new Error(result.error.message))
    }
  })
}

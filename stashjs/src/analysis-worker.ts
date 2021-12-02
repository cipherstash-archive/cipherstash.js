import { parentPort, workerData, isMainThread } from "worker_threads"
import { CipherSuite, makeCipherSuite, makeNodeCachingMaterialsManager } from "./crypto/cipher"
import { CollectionSchema } from "./collection-schema"
import { AnalysisConfig, AnalysisResult } from "./analysis-runner"
import { buildRecordAnalyzer, RecordAnalyzer } from "./analyzer"
import { Mappings, MappingsMeta, StashRecord } from "./dsl/mappings-dsl"
import { convertAnalyzedRecordToVectors } from "./grpc/put-helper"
import { idStringToBuffer, makeId } from "./utils"
import { makeAuthStrategy } from './auth/make-auth-strategy'
import { Memo, withFreshCredentials } from "./auth/auth-strategy"

if (!isMainThread) {
  const recordAnalyzerCache: { [collectionName: string]: any } = {}
  let cipherSuiteMemo: Memo<CipherSuite>

  async function performAnalyis(config: AnalysisConfig, record: StashRecord): Promise<AnalysisResult> {
    if (!cipherSuiteMemo) {
      const authStrategy = await makeAuthStrategy(config.profile)
      await authStrategy.initialise()
      cipherSuiteMemo = withFreshCredentials<CipherSuite>(authStrategy, ({ awsConfig }) => {
        return Promise.resolve(makeCipherSuite(
          makeNodeCachingMaterialsManager(
            config.profile.config.keyManagement.key.arn,
            awsConfig
          )
        ))
      })
    }
    const analyzer = getRecordAnalyzer(config.schema)
    const analyzedRecord = analyzer(record)
    const vectors = convertAnalyzedRecordToVectors(analyzedRecord, config.schema.meta)
    const encryptedSource = (await (await cipherSuiteMemo.freshValue()).encrypt(record)).result
    const result = {
      docId: record.id ? idStringToBuffer(record.id) : makeId(),
      vectors,
      encryptedSource
    }
    return result
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
    parentPort!.postMessage({ workerId: workerData.workerId, result })
  })
}

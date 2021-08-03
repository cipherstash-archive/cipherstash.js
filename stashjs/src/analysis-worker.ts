import { ThreadWorker } from "poolifier"
import AWS from "aws-sdk"
import { CollectionSchema } from "."
import { AnalysisJob, AnalysisResult } from "./analysis-pool"
import { buildRecordAnalyzer, RecordAnalyzer } from "./analyzer"
import { makeCipherSuite } from "./crypto/cipher"
import { Mappings, MappingsMeta, StashRecord } from "./dsl/mappings-dsl"
import { convertAnalyzedRecordToVectors } from "./grpc/put-helper"
import { idStringToBuffer, makeId } from "./utils"

const recordAnalyzerCache: { [collectionName: string]: any } = {}

async function performAnalyis(job: AnalysisJob): Promise<AnalysisResult> {
  const analyzer = getRecordAnalyzer(job.schema)
  const analyzedRecord = analyzer(job.record)
  const vectors = convertAnalyzedRecordToVectors(analyzedRecord, job.schema.meta)
  console.log("Perform Analysis", 1)
  const cipherSuite = makeCipherSuite(job.cmk)
  // AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  //   IdentityPoolId: job.awsCredentials.IdentityPoolId,
  //   Logins: job.awsCredentials.Logins
  // }, { region: job.awsCredentials.region })
  // await new Promise((resolve, reject) => {
  //   AWS.config.getCredentials((err, credentials) => {
  //     if (err) reject(err)
  //     resolve(credentials)
  //   })
  // })
  AWS.config.credentials = {
    accessKeyId: job.awsCredentials.accessKeyId,
    secretAccessKey: job.awsCredentials.secretAccessKey,
    sessionToken: job.awsCredentials.sessionToken
  }
  const encryptedSource = (await cipherSuite.encrypt(job.record)).result
  console.log("Perform Analysis", 2)
  return {
    docId: job.record.id ? idStringToBuffer(job.record.id) : makeId(),
    vectors,
    encryptedSource
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

export default new ThreadWorker<AnalysisJob, Promise<AnalysisResult>>(performAnalyis, {
  async: true,
} as any)

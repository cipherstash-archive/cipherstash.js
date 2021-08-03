import { V1 } from "@cipherstash/stashjs-grpc";
import { StashRecord } from "./dsl/mappings-dsl";
import { CollectionSchema } from "./collection-schema";
import { FixedThreadPool } from 'poolifier'
import * as os from 'os'
import { join } from 'path'
require('./analysis-worker') // force typescript to compile this file and make it available in "./dist"

export type AWSCredentials = {
  // IdentityPoolId: string,
  // Logins: {
  //   [idpHost: string]: string
  // },
  // region: string
  accessKeyId: string,
  secretAccessKey: string
  sessionToken: string
}

export type AnalysisResult = {
  docId: Buffer,
  vectors: Array<V1.VectorInput>,
  encryptedSource: Buffer
}

export type AnalysisJob = {
  awsCredentials: AWSCredentials,
  cmk: string,
  schema: CollectionSchema<any, any, any>,
  record: StashRecord
}

/**
 * Performs record analysis on all available CPU cores.
 */
export class AnalysisPool {
  private pool: FixedThreadPool<AnalysisJob, AnalysisResult>

  constructor() {
    this.pool = new FixedThreadPool(
      os.cpus().length,
      join(__dirname, './analysis-worker.js'),
      {
        errorHandler: e => console.error(e),
        onlineHandler: () => console.log('Worker is online')
      }
    )
  }

  public async *analyze(jobs: Iterator<AnalysisJob>): AsyncIterator<AnalysisResult> {
    let job = jobs.next()
    console.log("Analyze", 1)
    while (!job.done) {
      console.log("Analyze", 2)
      yield await this.throttleExecution(job.value)
      console.log("Analyze", 3)
      job = jobs.next()
      console.log("Analyze", 4)
    }
  }

  private async throttleExecution(job: AnalysisJob): Promise<AnalysisResult> {
    console.log("Wait 1")
    await this.whilePoolIsBusy()
    console.log("Wait 2")
    try {
      return await this.pool.execute(job)
    } catch (err) {
      console.error("Analysis Pool", err)
      return Promise.reject(err)
    }
  }

  private async whilePoolIsBusy(): Promise<void> {
    console.log("WhileBusy", 1)
    while (this.pool.busy) {
      console.log("WhileBusy", 2)
      await new Promise(resolve => {
        console.log("WhileBusy", 3)
        process.nextTick(() => resolve(void 0))
      })
    }
  }
}
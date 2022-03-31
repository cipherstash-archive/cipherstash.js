import { V1 } from "@cipherstash/stashjs-grpc";
import { StashRecord } from "./dsl/mappings-dsl";
import { CollectionSchema } from "./collection-schema";
import * as os from 'os'
import { join } from 'path'
import { Worker } from "worker_threads"
import { EventEmitter } from "events"
import { AsyncQueue } from "./async-queue";
import { StashProfile } from './stash-profile';
import { logger } from './logger';
import { AnalysisFailure } from "./errors";
import { describeError } from "./utils";

require('./analysis-worker') // force typescript to compile this file and make it available in "./dist"

export type AnalysisResult = {
  docId: Uint8Array,
  vectors: Array<V1.Document.Vector>,
  encryptedSource: Buffer
}

export type WorkerMessage = {
  workerId: number
  result: AnalysisResult
}

export type AnalysisConfig = {
  profile: StashProfile
  schema: CollectionSchema<any, any, any>
}

export class AnalysisRunner {
  private workers: Map<number, Worker> = new Map()
  private workerEvents: EventEmitter = new EventEmitter()
  private jobCount: number = 0

  constructor(private config: AnalysisConfig) {
    this.initialiseWorkers()
    this.workerEvents.setMaxListeners(100)
  }

  private initialiseWorkers(): void {
    for (let workerId = 0; workerId < os.cpus().length; workerId++) {
      const worker = new Worker(join(__dirname, './analysis-worker.js'), {
        workerData: { config: this.config, workerId }
      })
      worker.on('message', (message: WorkerMessage) => {
        this.workerEvents.emit('result', message)
      })
      worker.on('error', (err) => logger.error(err))
      this.workers.set(workerId, worker)
    }
  }

  private executeJob(worker: Worker, record: StashRecord): void {
    this.jobCount += 1
    worker.postMessage(record)
  }

  private shutdown(): void {
    this.workers.forEach(worker => worker.terminate())
    this.workers.clear()
  }

  private allJobsCompleted(successCount: number, failureCount: number): boolean {
    return this.jobCount === successCount + failureCount
  }

  public analyze(jobsIter: AsyncIterator<StashRecord>): AsyncIterator<AnalysisResult> {
    const queue =  new AsyncQueue<AnalysisResult>()

    let successCount = 0
    let failureCount = 0

    const executor = async () => {
      for (let worker of this.workers.values()) {
        let job = await jobsIter.next()
        if (!job.done) {
          this.executeJob(worker, job.value)
        }
      }

      this.workerEvents.on('result', async (message: WorkerMessage) => {
        successCount += 1
        queue.push(message.result)
        let job = await jobsIter.next()
        if (!job.done) {
          this.executeJob(this.workers.get(message.workerId)!, job.value)
        }

        if (this.allJobsCompleted(successCount, failureCount)) {
          queue.end()
          this.shutdown()
        }
      })

      this.workerEvents.on('messageerror', (error: AnalysisFailure) => {
        failureCount += 1
        console.error(`Error report from AnalysisWorker`)
        console.error(describeError(error))

        if (this.allJobsCompleted(successCount, failureCount)) {
          queue.end()
          this.shutdown()
        }
      })
    }

    executor()

    return queue
  }
}

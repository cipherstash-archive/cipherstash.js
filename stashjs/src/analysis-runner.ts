import { V1 } from "@cipherstash/stashjs-grpc";
import { StashRecord } from "./dsl/mappings-dsl";
import { CollectionSchema } from "./collection-schema";
import * as os from 'os'
import { join } from 'path'
import { Worker } from "worker_threads"
import { EventEmitter } from "events"
import { AsyncQueue } from "./async-queue";
import { StashProfile } from "./stash-profile";
require('./analysis-worker') // force typescript to compile this file and make it available in "./dist"

export type AnalysisResult = {
  docId: Buffer,
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
  private resultCount: number = 0

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
      worker.on('error', (err) => console.error(err))
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

  public analyze(jobsIter: AsyncIterator<StashRecord>): AsyncIterator<AnalysisResult> {
    const queue =  new AsyncQueue<AnalysisResult>()

    queue.once('drained', () => {
      this.shutdown()
    })

    const executor = async () => {
      for (let worker of this.workers.values()) {
        let job = await jobsIter.next()
        if (!job.done) {
          this.executeJob(worker, job.value)
        }
      }

      this.workerEvents.on('result', async (message: WorkerMessage) => {
        this.resultCount += 1
        queue.push(message.result)
        let job = await jobsIter.next()
        if (!job.done) {
          this.executeJob(this.workers.get(message.workerId)!, job.value)
        }

        if (job.done && this.jobCount == this.resultCount) {
          queue.end()
        }
      })
    }

    executor()

    return queue
  }
}

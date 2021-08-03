import { ClientDuplexStream } from "@grpc/grpc-js"
import { V1 } from "@cipherstash/stashjs-grpc"
import { CollectionSchema } from "."
import { AnalysisJob, AnalysisPool, AnalysisResult } from "./analysis-pool"
import { Mappings, MappingsMeta, StashRecord } from "./dsl/mappings-dsl"
import { Stash } from "./stash"
import AWS from "aws-sdk"

export class StreamWriter<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
> {

  private stream: ClientDuplexStream<V1.StreamingPutRequest, V1.StreamingPutReplyOutput>

  constructor(
    private stash: Stash,
    private schema: CollectionSchema<R, M, MM>,
    private analysisPool: AnalysisPool,
    private collectionId: Buffer,
    private awsCredentials: AWS.Credentials,
  ) {
    this.stream = this.stash.stub.putStream()
    // this.stream.on('data', function(putReply) {
    //   console.log("RECV MSG", putReply)
    //   writer.writeBatch()
    // })
    // this.stream.on('end', function() {
    //   console.log("END")
    // })
    // this.stream.on('error', function(e) {
    //   console.log("ERROR", e)
    // })
    // this.stream.on('status', function(status) {
    //   console.log("STATUS", status)
    // })
  }

  /**
   * Performs a streaming insert to a collection.
   *
   * @param records a source of records to insert. Must implement `Iterator`. A
   *                generator function will work.
   *
   * @returns a Promise that will resolve once all records from the iterator
   *          have been written.
   */
  public writeAll(records: Iterator<R>): Promise<void> {
    return this.writeStream(this.analysisPool.analyze(this.convertRecordsToJobs(records)))
  }

  private *convertRecordsToJobs(records: Iterator<R>): Iterator<AnalysisJob> {
    let record = records.next()
    console.log("convertRecordsToJobs", 1)
    while (!record.done) {
      console.log("convertRecordsToJobs", 2)
      yield {
        awsCredentials: {
          accessKeyId: this.awsCredentials.accessKeyId,
          secretAccessKey: this.awsCredentials.secretAccessKey,
          sessionToken: this.awsCredentials.sessionToken
        },
        cmk: this.stash.cmk,
        schema: this.schema,
        record: record.value
      }
      record = records.next()
    }
  }

  private async writeStream(analysisResults: AsyncIterator<AnalysisResult>): Promise<void> {
    console.log("WriteStream", 1)
    let result = await analysisResults.next()
    console.log("WriteStream ", 2, result)

    while (!result.done) {
      console.log("WriteStream", 3)
      await this.writeOneAnalysisResult(result.value)
      console.log("WriteStream", 4)
      result = await analysisResults.next()
      console.log("WriteStream", 5)
    }
    console.log("WriteStream", 6)
    this.stream.end()
    console.log("WriteStream", 7)
    return void 0
  }

  private async writeOneAnalysisResult(analysisResult: AnalysisResult): Promise<void> {
    const payload = {
      collectionId: this.collectionId,
      vectors: analysisResult.vectors,
      source: {
        id: analysisResult.docId,
        source: analysisResult.encryptedSource
      },
    }
    while (!this.stream.write(payload)) {
      await this.waitForDrain()
    }
  }

  private async waitForDrain(): Promise<void> {
    return new Promise(resolve => {
      this.stream.once('drain', () => resolve(void 0))
    })
  }
}

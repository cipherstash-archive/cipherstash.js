import { ClientWritableStream, Metadata } from "@grpc/grpc-js"
import { V1 } from "@cipherstash/stashjs-grpc"
import { CollectionSchema } from "."
import { AnalysisRunner, AnalysisResult } from "./analysis-runner"
import { Mappings, MappingsMeta, StashRecord } from "./dsl/mappings-dsl"
import { Stash } from "./stash"
import { AWSCredentials } from "./auth/aws-credentials"

export class StreamWriter<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
> {

  private analysisRunner: AnalysisRunner

  constructor(
    private stash: Stash,
    private schema: CollectionSchema<R, M, MM>,
    private collectionId: Buffer,
    private authToken: string,
    private awsCredentials?: AWSCredentials
  ) {
    this.analysisRunner = new AnalysisRunner({
      awsCredentials: this.awsCredentials,
      cmk: this.stash.cmk,
      schema: this.schema
    })
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
  public writeAll(records: AsyncIterator<R>): Promise<V1.StreamingPutReply> {
    return this.writeStream(this.analysisRunner.analyze(records))
  }

  private async writeStream(analysisResults: AsyncIterator<AnalysisResult>): Promise<V1.StreamingPutReply> {
    return new Promise(async (resolve, reject) => {
      const metaData = new Metadata()
      metaData.set('authorization', `Bearer ${this.authToken}`)
      const stream = this.stash.stub.putStream(metaData, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result!)
        }
      })
      await this.writeStreamingPutBegin(stream, this.collectionId)
      let result = await analysisResults.next()
      while (!result.done) {
        await this.writeOneStreamingPutRequest(stream, result.value)
        result = await analysisResults.next()
      }
      stream.end()
    })
  }

  private toStreamingPutRequest(analysisResult: AnalysisResult): V1.StreamingPutRequest {
    return {
      document: {
        vectors: analysisResult.vectors,
        source: {
          id: analysisResult.docId,
          source: analysisResult.encryptedSource
        }
      }
    }
  }

  private async writeStreamingPutBegin(stream: ClientWritableStream<V1.StreamingPutRequest>, collectionId: Buffer): Promise<void> {
    return new Promise(async (resolve) => {
      while (!stream.write({ begin: { collectionId }}, () => { resolve(void 0) })) {
        await this.waitForDrain(stream)
      }
    })
  }

  private async writeOneStreamingPutRequest(stream: ClientWritableStream<V1.StreamingPutRequest>, analysisResult: AnalysisResult): Promise<void> {
    const payload = this.toStreamingPutRequest(analysisResult)
    return new Promise(async (resolve) => {
      while (!stream.write(payload, () => { resolve(void 0) })) {
        await this.waitForDrain(stream)
      }
    })
  }

  private async waitForDrain(stream: ClientWritableStream<V1.StreamingPutRequest>): Promise<void> {
    return new Promise(resolve => {
      stream.once('drain', () => resolve(void 0))
    })
  }
}

import { ClientWritableStream } from "@grpc/grpc-js"
import { V1 } from "@cipherstash/stashjs-grpc"
import { CollectionSchema } from "."
import { AnalysisRunner, AnalysisResult } from "./analysis-runner"
import { Mappings, MappingsMeta, StashRecord } from "./dsl/mappings-dsl"
import { StashInternal } from "./stash-internal"
import { AsyncResult, Err, fromPromise, Ok } from "./result"
import { StreamingPutFailure } from "./errors"
import { makeAsyncResultApiWrapper } from "./stash-api-async-result-wrapper"
import { maybeGenerateId } from "./utils"

export class StreamWriter<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
> {

  private analysisRunner: AnalysisRunner
  private api: ReturnType<typeof makeAsyncResultApiWrapper>

  constructor(
    private collectionId: Buffer,
    stash: StashInternal,
    schema: CollectionSchema<R, M, MM>,
  ) {
    this.analysisRunner = new AnalysisRunner({ profile: stash.profile, schema })
    this.api = makeAsyncResultApiWrapper(stash.stub, stash.authStrategy)
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
  public writeAll(records: AsyncIterator<R>): AsyncResult<V1.Document.StreamingPutReply, StreamingPutFailure> {
    return this.writeStream(this.analysisRunner.analyze(records))
  }

  private async writeStream(analysisResults: AsyncIterator<AnalysisResult>): AsyncResult<V1.Document.StreamingPutReply, StreamingPutFailure> {
    const initialised = await this.api.document.putStream()
    if (initialised.ok) {
      const { stream, reply } = initialised.value
      const begin = await this.writeStreamingPutBegin(stream, this.collectionId)
      if (!begin.ok) {
        return Err(begin.error)
      }
      let result = await analysisResults.next()
      while (!result.done) {
        const putRequest = await this.writeOneStreamingPutRequest(stream, result.value)
        if (!putRequest.ok) {
          return Err(putRequest.error)
        }
        result = await analysisResults.next()
      }
      stream.end()

      const message = await reply
      if (message.ok) {
        return Ok(message.value)
      } else {
        return Err(StreamingPutFailure(message.error))
      }
    } else {
      return Err(StreamingPutFailure(initialised.error))
    }
  }

  private toStreamingPutRequest(analysisResult: AnalysisResult): V1.Document.StreamingPutRequest {
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


  private async writeStreamingPutBegin(stream: ClientWritableStream<V1.Document.StreamingPutRequest>, collectionId: Buffer): AsyncResult<void, StreamingPutFailure> {
    const promise = new Promise<void>(async (resolve, reject) => {
      if (!stream.write({ begin: { collectionId }}, (err: any) => reject(err))) {
        stream.once('error', (err: any) => reject(err))
        stream.once('drain', () => resolve(void 0))
      } else {
        process.nextTick(() => resolve(void 0))
      }
    })

    return fromPromise(promise, (err: any) => err)
  }

  private async writeOneStreamingPutRequest(stream: ClientWritableStream<V1.Document.StreamingPutRequest>, analysisResult: AnalysisResult): AsyncResult<void, StreamingPutFailure> {
    let payload = this.toStreamingPutRequest(analysisResult)
    payload.document!.source = maybeGenerateId(payload.document?.source)
    const promise = new Promise<void>(async (resolve, reject) => {
      if (!stream.write(payload, (err: any) => reject(err))) {
        stream.once('error', (err: any) => reject(err))
        stream.once('drain', () => resolve(void 0))
      } else {
        process.nextTick(() => resolve(void 0))
      }
    })

    return fromPromise(promise, (err: any) => err)
  }
}


import { StashRecord, Mappings, MappingsMeta, HasID } from "./dsl/mappings-dsl"
import { Query, QueryBuilder } from "./dsl/query-dsl"
import { StashInternal } from "./stash-internal"
import { maybeGenerateId, normalizeId } from "./utils"
import { convertAnalyzedRecordToVectors } from "./grpc/put-helper"
import { convertQueryReplyToQueryResult } from "./grpc/query-helper"
import { convertGetReplyToUserRecord, convertGetAllReplyToUserRecords } from "./grpc/get-helper"
import { CollectionSchema } from "./collection-schema"
import { buildQueryAnalyzer, buildRecordAnalyzer, QueryAnalyzer, RecordAnalyzer, AnalyzedQuery } from "./analyzer"
import { StreamWriter } from "./stream-writer"
import { V1 } from "@cipherstash/stashjs-grpc"
import { AsyncResult, convertErrorsTo, Err, Ok, parallel, sequence, Unit } from "./result"
import { DocumentDeleteFailure, DocumentGetAllFailure, DocumentGetFailure, DocumentPutFailure, DocumentQueryFailure, QueryBuilderError, QueryBuilderFailure, StreamingPutFailure } from "./errors"
import { stringify as stringifyUUID } from 'uuid'

const DEFAULT_QUERY_LIMIT = 50;

/**
 * A CollectionProxy represents a connection to an underlying Collection.
 *
 * All methods of manipulating and interacting with a Collection can be found here.
 */
export class CollectionInternal<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
> {

  private analyzeRecord: RecordAnalyzer<R, M, MM>
  private analyzeQuery: QueryAnalyzer<R, M>

  public constructor(
    private readonly stash: StashInternal,
    public readonly id: string,
    public readonly ref: string,
    public readonly schema: CollectionSchema<R, M, MM>,
  ) {
    this.analyzeRecord = buildRecordAnalyzer(schema)
    this.analyzeQuery = buildQueryAnalyzer(schema)
  }

  public get name() {
    return this.schema.name
  }

  public async get(id: string | Buffer): AsyncResult<R & HasID | null, DocumentGetFailure> {
    const docId = id instanceof Buffer ? id : normalizeId(id)
    const collectionId = normalizeId(this.id)

    return convertErrorsTo(
      DocumentGetFailure,
      await sequence(
        parallel(
          _ => this.stash.sourceDataCipherSuiteMemo.freshValue(),
          this.stash.api.document.get,
        ),
        ([_, cipher, reply]) => convertGetReplyToUserRecord(cipher)<R & HasID>(reply!)
      )({ collectionId, id: docId })
    )
  }

  public async getAll(ids: Array<string | Buffer>): AsyncResult<Array<R>, DocumentGetAllFailure> {
    const docIds = ids.map((id) => {
      return (id instanceof Buffer) ? id : normalizeId(id)
    })

    const collectionId = normalizeId(this.id)

    return convertErrorsTo(
      DocumentGetAllFailure,
      await sequence(
        parallel(
          _ => this.stash.sourceDataCipherSuiteMemo.freshValue(),
          this.stash.api.document.getAll
        ),
        ([_, cipher, reply]) => convertGetAllReplyToUserRecords(cipher)<R>(reply!)
      )({ collectionId, ids: docIds })
    )
  }

  public async put(doc: R): AsyncResult<string, DocumentPutFailure> {
    const collectionId = normalizeId(this.id)
    const docWithId = maybeGenerateId(doc)
    const vectors = convertAnalyzedRecordToVectors(this.analyzeRecord(docWithId as any as R))

    return convertErrorsTo(
      DocumentPutFailure,
      await sequence(
          _ => this.stash.sourceDataCipherSuiteMemo.freshValue(),
         cipher => cipher.encrypt(doc),
         source => this.stash.api.document.put({ collectionId, vectors, source: { id: docWithId.id, source: source.result } }),
         _ => Ok.Async(stringifyUUID(docWithId.id))
      )(Unit)
    )
  }

  public async query(
    callbackOrQueryOptions: ((where: QueryBuilder<R, M>) => Query<R, M>) | QueryOptions<R, M>,
    queryOptions?: QueryOptions<R, M>
  ): AsyncResult<QueryResult<R & HasID>, DocumentQueryFailure> {

    if (typeof callbackOrQueryOptions === 'function') {
      return this.queryWithConstraints(
        callbackOrQueryOptions as (where: QueryBuilder<R, M>) => Query<R, M>,
        queryOptions ? queryOptions : {}
      )
    } else {
      return this.queryWithoutConstraints(callbackOrQueryOptions as QueryOptions<R, M>)
    }
  }

  public async delete(id: string | Buffer): AsyncResult<null, DocumentDeleteFailure> {
    const docId = id instanceof Buffer ? id : normalizeId(id)
    const collectionId = normalizeId(this.id)

    return convertErrorsTo(
      DocumentDeleteFailure,
      await sequence(
        this.stash.api.document.delete,
        _ => Ok.Async(null)
      )({ collectionId, id: docId })
    )
  }

  public async putStream(records: AsyncIterator<R>): AsyncResult<V1.Document.StreamingPutReply, StreamingPutFailure> {
    const streamWriter: StreamWriter<R, M, MM> = new StreamWriter(
      normalizeId(this.id),
      this.stash,
      this.schema
    )
    return streamWriter.writeAll(records)
  }

  private async queryWithConstraints(
    callback: (where: QueryBuilder<R, M>) => Query<R, M>,
    queryOptions?: QueryOptions<R, M>
  ): AsyncResult<QueryResult<R & HasID>, DocumentQueryFailure> {
    const options = queryOptions ? queryOptions : {}

    let pendingQuery: Query<R, M>;

    try {
      pendingQuery = callback(this.schema.makeQueryBuilder());
    } catch (error) {
      if (error instanceof QueryBuilderError) {
        return Err(
          DocumentQueryFailure(
            QueryBuilderFailure(error)
          )
        );
      }

      // If some unknown exception was raised we're not ready to deal with it.
      // Just pass the error on.
      throw error;
    }

    const query = this.analyzeQuery(pendingQuery)

    const timerStart = process.hrtime.bigint()

    return convertErrorsTo(
      DocumentQueryFailure,
      await sequence(
        parallel(
          _ => this.stash.sourceDataCipherSuiteMemo.freshValue(),
          sequence(
            _ => this.buildQueryRequest(options, query),
            this.stash.api.query.query
          )
        ),
        ([_, cipher, reply]) => convertQueryReplyToQueryResult<R & HasID>(cipher, timerStart, reply!)
      )(Unit)
    )
  }

  private async queryWithoutConstraints(options: QueryOptions<R, M>): AsyncResult<QueryResult<R & HasID>, DocumentQueryFailure> {
    const timerStart = process.hrtime.bigint()
    return convertErrorsTo(
      DocumentQueryFailure,
      await sequence(
        parallel(
          _ => this.stash.sourceDataCipherSuiteMemo.freshValue(),
          sequence(
            _ => this.buildQueryRequest(options, { constraints: [] }),
            this.stash.api.query.query
          )
        ),
        ([_, cipher, reply]) => convertQueryReplyToQueryResult<R & HasID>(cipher, timerStart, reply!)
      )(Unit)
    )
  }


  private buildQueryRequest(options: QueryOptions<R, M>, query: AnalyzedQuery): AsyncResult<V1.Query.QueryRequest, never> {
    const constraints = query.constraints

    return Ok.Async({
      collectionId: normalizeId(this.id),
      query: {
        limit: options.limit || DEFAULT_QUERY_LIMIT,
        constraints,
        aggregates: options.aggregation ? options.aggregation.map(agg => ({
          indexId: normalizeId(this.schema.meta[agg.ofIndex]!.$indexId),
          type: agg.aggregate
        })) : [],
        skipResults: typeof options.skipResults == "boolean" ? options.skipResults : false,
        offset: options.offset,
        ordering: options.order ? options.order.map(o => ({
          indexId: normalizeId(this.schema.meta[o.byIndex]!.$indexId),
          direction: o.direction
        })) : []
      }
    })
  }
}

export type QueryResult<R> = {
  took: number,
  documents: Array<R>,
  aggregates: Array<AggregateResult>
}

export type AggregateResult = {
  name: Aggregate,
  value: bigint
}

export type AggregationOptions<
  R extends StashRecord,
  M extends Mappings<R>
> = {
  ofIndex: Extract<keyof M, string>
  aggregate: Aggregate
}

// Count is the only aggregate operation we support right now.
export type Aggregate = "count"

export type OrderingOptions<
  R extends StashRecord,
  M extends Mappings<R>
> = {
  byIndex: Extract<keyof M, string>
  direction: Ordering
}

export type Ordering = "ASC" | "DESC"

export type QueryOptions<
  R extends StashRecord,
  M extends Mappings<R>
> = {
  aggregation?: Array<AggregationOptions<R, M>>
  order?: Array<OrderingOptions<R, M>>
  offset?: number,
  limit?: number
  skipResults?: boolean
}

export type CollectionMetadata = {
  name: string
}

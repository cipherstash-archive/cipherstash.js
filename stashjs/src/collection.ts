import { StashRecord, Mappings, MappingsMeta, HasID } from "./dsl/mappings-dsl"
import { Query, QueryBuilder } from "./dsl/query-dsl"
import { Stash } from "./stash"
import { idStringToBuffer, makeId } from "./utils"
import { convertAnalyzedRecordToVectors } from "./grpc/put-helper"
import { convertQueryReplyToUserRecords } from "./grpc/query-helper"
import { convertGetReplyToUserRecord } from "./grpc/get-helper"
import { CollectionSchema } from "./collection-schema"
import { buildQueryAnalyzer, buildRecordAnalyzer, QueryAnalyzer, RecordAnalyzer } from "./analyzer"

/**
 * A CollectionProxy represents a connection to an underlying Collection.
 *
 * All methods of manipulating and interacting with a Collection can be found here.
 */
export class Collection<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
> {

  private analyzeRecord: RecordAnalyzer<R, M, MM>
  private analyzeQuery: QueryAnalyzer<R, M>

  public constructor(
    private readonly stash: Stash,
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

  public get query() {
    return this.schema.buildQuery
  }

  public async get(id: string | Buffer): Promise<R & HasID | null> {
    const docId = id instanceof Buffer ? id : idStringToBuffer(id)
    return new Promise(async (resolve, reject) => {
      this.stash.stub.get({
        context: { authToken: await this.stash.refreshToken() },
        collectionId: idStringToBuffer(this.id),
        id: docId
      }, (err, res) => {
        if (err) { reject(err) }
        if (res?.source) {
          resolve(convertGetReplyToUserRecord(res, this.stash.cipherSuite))
        } else {
          reject("Unexpectedly received empty response from data-service")
        }
      })
    })
  }

  public async put(doc: R): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const docId = doc.id ? idStringToBuffer(doc.id) : makeId()
      const docWithId = {
        ...doc,
        id: docId,
      } as R
      this.stash.stub.put({
        context: { authToken: await this.stash.refreshToken() },
        collectionId: idStringToBuffer(this.id),
        vectors: convertAnalyzedRecordToVectors(
          this.analyzeRecord(docWithId),
          this.schema.meta
        ),
        source: {
          id: docId,
          source: (await this.stash.cipherSuite.encrypt(docWithId)).result
        },
      }, (err, _res) => {
        if (err) { reject(err) }
        // TODO we should return the doc ID from the response but `put` does not
        // yet return an ID at the GRPC level.
        resolve(docId.toString('hex'))
      })
    })
  }

  public async all(callback: (where: QueryBuilder<R, M>) => Query<R, M>, queryOptions?: QueryOptions<R, M>): Promise<QueryResult<R & HasID>> {
    const options = queryOptions ? queryOptions : {}
    return new Promise(async (resolve, reject) => {
      this.stash.stub.query({
        context: { authToken: await this.stash.refreshToken() },
        collectionId: idStringToBuffer(this.id),
        query: {
          limit: options.limit,
          constraints: this.analyzeQuery(callback(this.schema.makeQueryBuilder())).constraints,
          aggregates: options.aggregation ? options.aggregation.map(agg => ({
            indexId: this.schema.meta[agg.ofIndex]!.$indexId,
            type: agg.aggregate
          })) : [],
          skipResults: typeof options.skipResults == "boolean" ? options.skipResults : false,
          offset: options.offset,
          ordering: options.order ? options.order.map(o => ({
            indexId: this.schema.meta[o.byIndex]!.$indexId,
            direction: o.direction
          })) : []
        }
      }, async (err, res) => {
        if (err) { reject(err) }
        resolve({
          documents: await convertQueryReplyToUserRecords<R & HasID>(res!, this.stash.cipherSuite),
          aggregates: res!.aggregates ? res!.aggregates.map(agg => ({
            name: agg.name! as Aggregate,
            value: BigInt(agg.value!.toString())
          })) : []
        })
      })
    })
  }

  public async delete(id: string | Buffer): Promise<null> {
    const docId = id instanceof Buffer ? id : idStringToBuffer(id)
    return new Promise(async (resolve, reject) => {
      this.stash.stub.delete({
        context: { authToken: await this.stash.refreshToken() },
        collectionId: idStringToBuffer(this.id),
        id: docId
      }, (err, _res) => {
        if (err) { reject(err) }
        resolve(null)
      })
    })
  }
}

export type QueryResult<R> = {
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
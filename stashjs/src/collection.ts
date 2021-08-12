import { StashRecord, Mappings, MappingsMeta, HasID } from "./dsl/mappings-dsl"
import { Query, QueryBuilder } from "./dsl/query-dsl"
import { Stash } from "./stash"
import { idStringToBuffer, makeId, stringify } from "./utils"
import { convertAnalyzedRecordToVectors } from "./grpc/put-helper"
import { convertQueryReplyToUserRecords } from "./grpc/query-helper"
import { convertGetReplyToUserRecord, convertGetAllReplyToUserRecords } from "./grpc/get-helper"
import { CollectionSchema } from "./collection-schema"
import { buildQueryAnalyzer, buildRecordAnalyzer, QueryAnalyzer, RecordAnalyzer, AnalyzedQuery } from "./analyzer"

const DEFAULT_QUERY_LIMIT = 50;

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

  public async getAll(ids: Array<string | Buffer>): Promise<Array<R>> {
    const docIds = ids.map((id) => {
      return (id instanceof Buffer) ? id : idStringToBuffer(id)
    })

    return new Promise(async (resolve, reject) => {
      this.stash.stub.getAll({
        context: { authToken: await this.stash.refreshToken() },
        collectionId: idStringToBuffer(this.id),
        ids: docIds
      }, (err, res) => {
        if (err) { reject(err) }
        if (res?.documents) {
          resolve(convertGetAllReplyToUserRecords(res, this.stash.cipherSuite))
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
      const vectors = convertAnalyzedRecordToVectors(
        this.analyzeRecord(docWithId),
        this.schema.meta
      )
      if (process.env['CS_DEBUG'] == 'yes') {
        console.log(stringify(vectors))
      }
      this.stash.stub.put({
        context: { authToken: await this.stash.refreshToken() },
        collectionId: idStringToBuffer(this.id),
        vectors,
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

  public async query(
    callbackOrQueryOptions: ((where: QueryBuilder<R, M>) => Query<R, M>) | QueryOptions<R, M>,
    queryOptions?: QueryOptions<R, M>): Promise<QueryResult<R & HasID>> {

    if (typeof callbackOrQueryOptions === 'function') {
      return this.queryWithConstraints(
        callbackOrQueryOptions as (where: QueryBuilder<R, M>) => Query<R, M>,
        queryOptions ? queryOptions : {}
      )
    } else {
      return this.queryWithoutConstraints(callbackOrQueryOptions as QueryOptions<R, M>)
    }
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

  async queryWithConstraints(callback: (where: QueryBuilder<R, M>) => Query<R, M>,
    queryOptions?: QueryOptions<R, M>): Promise<QueryResult<R & HasID>> {

    const options = queryOptions ? queryOptions : {}
    return new Promise(async (resolve, reject) => {
      const query = this.analyzeQuery(callback(this.schema.makeQueryBuilder()))

      if (process.env['CS_DEBUG']) {
        console.log(stringify(query.constraints))
      }

      // Time the execution
      const timerStart = (new Date()).getTime()
      let request = await this.buildQueryRequest(options, query)

      this.stash.stub.query(request, async (err, res) => {
        if (err) { reject(err) }
        const timerEnd = (new Date()).getTime()

        resolve({
          took: (timerEnd - timerStart)/1000,
          documents: await convertQueryReplyToUserRecords<R & HasID>(res!, this.stash.cipherSuite),
          aggregates: res!.aggregates ? res!.aggregates.map(agg => ({
            name: agg.name! as Aggregate,
            value: BigInt(agg.value!.toString())
          })) : []
        })
      })
    })
  }

  async queryWithoutConstraints(options: QueryOptions<R, M>): Promise<QueryResult<R & HasID>> {
    return new Promise(async (resolve, reject) => {
      // Time the execution
      const timerStart = (new Date()).getTime()
      const request = await this.buildQueryRequest(options, {constraints: []})

      this.stash.stub.query(request, async (err, res) => {
        if (err) { reject(err) }
        const timerEnd = (new Date()).getTime()

        resolve({
          took: (timerEnd - timerStart)/1000,
          documents: await convertQueryReplyToUserRecords<R & HasID>(res!, this.stash.cipherSuite),
          aggregates: res!.aggregates ? res!.aggregates.map(agg => ({
            name: agg.name! as Aggregate,
            value: BigInt(agg.value!.toString())
          })) : []
        })
      })
    })
  }

  async buildQueryRequest(options: QueryOptions<R, M>, query: AnalyzedQuery) {
    const constraints = query.constraints

    return {
      context: { authToken: await this.stash.refreshToken() },
      collectionId: idStringToBuffer(this.id),
      query: {
        limit: options.limit || DEFAULT_QUERY_LIMIT,
        constraints,
        aggregates: options.aggregation ? options.aggregation.map(agg => ({
          indexId: this.schema.meta[agg.ofIndex]!.$indexId,
          type: agg.aggregate
        })) : [],
        skipResults: typeof options.skipResults == "boolean" ? options.skipResults : false,
        offset: options.offset,
        ordering: options.order ? options.order.map(o => ({
          indexId: idStringToBuffer(this.schema.meta[o.byIndex]!.$indexId),
          direction: o.direction
        })) : []
      }
    }
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

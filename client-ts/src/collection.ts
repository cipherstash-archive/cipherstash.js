import { StashRecord, Mappings, NewStashRecord, MappingsMeta } from "./dsl/mappings-dsl"
import { Query, QueryBuilder } from "./dsl/query-dsl"
import { analyzeRecord } from "./indexer"
import { Stash } from "./stash"
import { idStringToBuffer, makeId } from "./utils"
import { convertAnalyzedRecordToVectors } from "./grpc/put-helper"
import { convertQueryReplyToUserRecords, convertQueryToContraints } from "./grpc/query-helper"
import { CollectionSchema } from "./collection-schema"

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

  public constructor(
    private readonly stash: Stash,
    public readonly id: string,
    public readonly ref: string,
    public readonly schema: CollectionSchema<R, M, MM>,
  ) { }

  public get name() {
    return this.schema.name
  }

  public get query() {
    return this.schema.buildQuery
  }

  public async get(id: string): Promise<R | null> { 
    return new Promise((resolve, reject) => {
      this.stash.stub.get({
        collectionId: this.ref,
        id: idStringToBuffer(id)
      }, (err, res) => {
        if (err) { reject(err) }
        if (res!.source) {
          resolve(this.stash.cipherSuite.decrypt(res!.source!.source!))
        } else {
          resolve(null)
        }
      })
    })
  }

  public async put(doc: NewStashRecord<R>): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const docId = doc.id ? idStringToBuffer(doc.id) : makeId()
      const docWithId: R = {
        ...doc,
        id: docId,
      } as R // TODO: figure out why I need to do this
      this.stash.stub.put({
        context: { authToken: await this.stash.refreshToken() },
        collectionId: idStringToBuffer(this.id),
        vectors: convertAnalyzedRecordToVectors(
          await analyzeRecord(this, docWithId),
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

  public all(callback: (where: QueryBuilder<R, M>) => Query<R, M>, queryOptions?: QueryOptions<R, M>): Promise<QueryResult<R>> {
    const options = queryOptions ? queryOptions : {}
    return new Promise(async (resolve, reject) => {
      this.stash.stub.query({
        context: { authToken: await this.stash.refreshToken() },
        collectionId: idStringToBuffer(this.id),
        query: {
          limit: options.limit,
          constraints: convertQueryToContraints<R, M, Query<R, M>, MappingsMeta<M>>(
            callback(this.schema.makeQueryBuilder()),
            this.schema.meta
          ),
          aggregates: options.aggregation ? options.aggregation.map(a => ({
            indexId: this.schema.meta[a.ofIndex]!.$indexId,
            type: a.aggregate
          })) : undefined,
          skipResults: typeof options.skipResults == "boolean" ? options.skipResults : false,
          offset: options.offset,
          ordering: options.order ? options.order.map(o => ({
            indexId: this.schema.meta[o.byIndex]!.$indexId,
            direction: o.direction
          })) : undefined
        }
      }, async (err, res) => {
        if (err) { reject(err) }
        resolve({
          documents: await convertQueryReplyToUserRecords<R>(res!, this.stash.cipherSuite),
          aggregates: res!.aggregates ? res!.aggregates.map(agg => ({
            name: agg.name! as Aggregate,
            value: BigInt(agg.value!.toString())
          })) : []
        })
      })
    })
  }

  public delete(_id: string): Promise<string> {
    return Promise.reject("Not implemented: delete record by ID")
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
import { V1 } from "@cipherstash/stashjs-grpc";
import { CollectionInternal, QueryOptions, QueryResult } from "./collection-internal";
import { HasID, Mappings, MappingsMeta, StashRecord } from "./dsl/mappings-dsl";
import { Query, QueryBuilder } from "./dsl/query-dsl";
import { convertPrivateApiResult } from "./result";

export class Collection<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
> {
  constructor(private collection: CollectionInternal<R, M, MM>) {}

  public get name() { return this.collection.name }

  public get schema() { return this.collection.schema }

  public get(id: string | Buffer): Promise<R & HasID | null> {
    return convertPrivateApiResult(this.collection.get(id))
  }

  public getAll(ids: Array<string | Buffer>): Promise<Array<R>> {
    return convertPrivateApiResult(this.collection.getAll(ids))
  }

  public put(doc: R): Promise<string> {
    return convertPrivateApiResult(this.collection.put(doc))
  }

  public query(
    callbackOrQueryOptions: ((where: QueryBuilder<R, M>) => Query<R, M>) | QueryOptions<R, M>,
    queryOptions?: QueryOptions<R, M>
  ): Promise<QueryResult<R & HasID>> {
    return convertPrivateApiResult(this.collection.query(callbackOrQueryOptions, queryOptions))
  }

  public delete(id: string | Buffer): Promise<null> {
    return convertPrivateApiResult(this.collection.delete(id))
  }

  public putStream(records: AsyncIterator<R>): Promise<V1.Document.StreamingPutReply> {
    return convertPrivateApiResult(this.collection.putStream(records))
  }
}

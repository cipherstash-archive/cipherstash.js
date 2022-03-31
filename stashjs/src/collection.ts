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

  public get id() { return this.collection.id }
  public get ref() { return this.collection.ref }

  /**
   * The name of the collection
   *
   * ```ts
   * const stash = await Stash.connect();
   * const movies = await stash.loadCollection('movies');
   * movies.name // 'movies'
   * ```
   */
  public get name() { return this.collection.name }

  /**
   * The underlying `CollectionSchema` for the collection
   */
  public get schema() { return this.collection.schema }

  /**
   * Retrieve a record by id
   *
   * ```ts
   * const stash = await Stash.connect();
   * const movies = await stash.loadCollection<Movie>('movies');
   *
   * const movie = await movies.get(...);
   * ```
   */
  public get(id: string | Buffer): Promise<R & HasID | null> {
    return convertPrivateApiResult(this.collection.get(id))
  }

  /**
   * Retrieve an array of records from an array of ids
   *
   * ```ts
   * const stash = await Stash.connect();
   * const movies = await stash.loadCollection<Movie>('movies');
   *
   * const [ first, second ] = await movies.getAll([ ..., ... ]);
   * ```
   */
  public getAll(ids: Array<string | Buffer>): Promise<Array<R>> {
    return convertPrivateApiResult(this.collection.getAll(ids))
  }

  /**
   * Upsert a record into the collection
   *
   * ```ts
   * const stash = await Stash.connect();
   * const movies = await stash.loadCollection<Movie>('movies');
   *
   * const id = await movies.put({
   *   title: 'CipherStash Reloaded',
   *   year: 2022
   * });
   * ```
   */
  public put(doc: R): Promise<string> {
    return convertPrivateApiResult(this.collection.put(doc))
  }

  /**
   * Query a collection based on its schema
   *
   * ```ts
   * const stash = await Stash.connect();
   * const movies = await stash.loadCollection(movieSchema);
   *
   * const { documents } = await movies.query(
   *   movie => movie.year.lte(1960)
   * );
   * ```
   */
  public query(
    callbackOrQueryOptions: ((where: QueryBuilder<R, M>) => Query<R, M>) | QueryOptions<R, M>,
    queryOptions?: QueryOptions<R, M>
  ): Promise<QueryResult<R & HasID>> {
    return convertPrivateApiResult(this.collection.query(callbackOrQueryOptions, queryOptions))
  }

  /**
   * Delete a record by id
   *
   * ```ts
   * const stash = await Stash.connect();
   * const movies = await stash.loadCollection<Movie>('movies');
   *
   * const movie = await movies.delete(...);
   * ```
   */
  public delete(id: string | Buffer): Promise<null> {
    return convertPrivateApiResult(this.collection.delete(id))
  }

  /**
   * Put multiple records into a collection using an async generator
   *
   * ```ts
   * async function* fetchMovies() {
   *   const first = await fetchFirstMovie();
   *   yield first;
   *
   *   const second = await fetchSecondMovie();
   *   yield second;
   * }
   *
   * const stash = await Stash.connect();
   * const movies = await stash.loadCollection<Movie>('movies');
   *
   * awat movies.putStream(fetchMovies);
   * ```
   */
  public putStream(records: AsyncIterator<R>): Promise<V1.Document.StreamingPutReply> {
    return convertPrivateApiResult(this.collection.putStream(records))
  }
}

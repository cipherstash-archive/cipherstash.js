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

  /**
   * The UUID of the collection used internally
   *
   * As this field is for internal use only use the `Collection.name` field if
   * you need to reference a collection.
   *
   * @see Collection.name
   *
   */
  public get id() { return this.collection.id }

  /**
   * A cryptographically secure identifier for the collection
   *
   * This field is generated using your profile's naming key and the name of the
   * collection and is used when communicating with CipherStash.
   */
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
   *
   * @param id - the id of the document to be retrieved
   *
   * @returns A promise containing the retrieved document if it exists
   *
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
   *
   * @param ids - An array or buffer of ids to be retrieved
   *
   * @returns - An array containing the retrieved documents
   *
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
   *
   * @param doc - the document to be inserted into
   *
   * @returns A promise resolving with the id of the inserted document
   *
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
   *
   * @param callbackOrQueryOptions - a callback function for building a query, or a query options object
   * @param queryOptions - an optional object containing query options
   *
   * @returns A `QueryResult` object containing the documents, aggregates and the time query took
   *
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
   *
   * @param id - the id of the document to be deleted
   *
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
   * await movies.putStream(fetchMovies);
   * ```
   *
   * @param records - AsyncIterator that yields the docs to be inserted
   * @returns A promise that resolves with the number of documents inserted
   *
   */
  public putStream(records: AsyncIterator<R>): Promise<V1.Document.StreamingPutReply> {
    return convertPrivateApiResult(this.collection.putStream(records))
  }
}

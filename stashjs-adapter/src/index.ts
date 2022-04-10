import { Stash, Collection, Mappings, MappingsMeta, QueryBuilder, Query, QueryOptions } from "@cipherstash/stashjs"
import { v5 as uuidv5 } from 'uuid'

export type CSType<T> = Omit<T, "id"> & { originalId: number, id: string }
type MappingsWrapper<T> = Mappings<CSType<T>>
type MappingsMetaWrapper<T> = MappingsMeta<MappingsWrapper<T>>
type CollectionWrapper<T> = Collection<CSType<T>, MappingsWrapper<T>, MappingsMetaWrapper<T>>

export type QueryCallback<T> = (where: QueryBuilder<CSType<T>, MappingsWrapper<T>>) => Query<CSType<T>, MappingsWrapper<T>>
export type CollectionQueryOptions<T> = QueryOptions<CSType<T>, MappingsWrapper<T>>
export type QueryCallbackOrOptions<T> = QueryCallback<T> | CollectionQueryOptions<T>

/*
 * Wrapper class for `Collection` that simplifies storing of types with numeric IDs
 * in CipherStash as well as manages the collection loading handshake step.
 * 
 * If you have a type in your app (say a `User`), you can use this class to define an API that wraps
 * the underlying Collection and automatically converts the type to a CSType.
 * 
 * `CSType<T>` is defined in terms of `T` but adds an `originalId` attribute and changes
 * the type of `id` from `number` to a `string` so that it can be used with CipherStash secure IDs.
 * 
 * All functions in this class deal with `T` to the caller but map to `CSType<T>` internally.
 * 
 * ## Collection Loading
 * 
 * The `loadCollection` step in CipherStash can take a few hundred milliseconds so this class
 * loads it once the first time any function is called and caches it.
 * 
 * See also https://docs.cipherstash.com/tsdoc/modules/_cipherstash_stashjs.html
 */
export class CollectionAPI<T extends { id: number }> {
  #collection: Promise<CollectionWrapper<T>>;
  idNamespace: string;

  constructor(name: string, idNamespace: string) {
    this.idNamespace = idNamespace
    /* Keep a promise to load the collection. The first time we await this will resolve.
     * Subsequent awaits will just pass through the resolved promise. */
    this.#collection = Stash.connect()
      .then(stash => stash.loadCollection<CSType<T>>(name))
  }

  /*
   * Wrapper for `Collection.put` but takes a numeric ID
   * and returns `T`.
   * 
   * See also https://docs.cipherstash.com/tsdoc/classes/_cipherstash_stashjs.Collection.html#get
   */
  async put(record: T): Promise<string> {
    let mappedId = this.mapId(record.id)
    const cln = await this.#collection

    return await cln.put({
      ...record,
      id: mappedId,
      originalId: record.id
    })
  }

  /*
   * Wrapper for `Collection.get` but takes a numeric ID
   * and returns `T`.
   * 
   * See also https://docs.cipherstash.com/tsdoc/classes/_cipherstash_stashjs.Collection.html#get
   */
  async get(id: number): Promise<T> {
    const cln = await this.#collection
    let record = await cln.get(this.mapId(id))

    if (record) {
      return { ...record, id: id } as unknown as T
    } else {
      throw(`No record with id=${id}`)
    }
  }

  async getAll(ids: Array<string>): Promise<Array<T>> {
    const cln = await this.#collection
    return await cln.getAll(ids)
      .then(records => records.map(record => (
        { ...record, id: record.originalId } as unknown as T
      )))
  }

  async delete(id: number) {
    const cln = await this.#collection
    await cln.delete(this.mapId(id))
  }

  async query(
    callbackOrQueryOptions: QueryCallbackOrOptions<T>,
    queryOptions?: CollectionQueryOptions<T>
  ): Promise<Array<T>> {
    const collection = await this.#collection
    let result = await (queryOptions ? 
      collection.query(callbackOrQueryOptions, queryOptions) :
      collection.query(callbackOrQueryOptions))

    return result.documents.map(record => (
      { ...record, id: record.originalId } as unknown as T
    ))
  }

  async list(options?: CollectionQueryOptions<T>): Promise<Array<T>> {
    return await this.query(options ? options : {})
  }

  private mapId(id: number): string {
    return uuidv5(`${id}`, this.idNamespace)
  }
}


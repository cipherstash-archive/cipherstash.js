
import { Stash, Collection, Mappings, MappingsMeta, QueryBuilder, Query, QueryOptions } from "@cipherstash/stashjs"
import { v4 as uuidv4 } from 'uuid'

export type CSType<T> = Omit<T, "id"> & { id?: string, originalId: number }
type MappingsWrapper<T> = Mappings<CSType<T>>
type MappingsMetaWrapper<T> = MappingsMeta<MappingsWrapper<T>>
type CollectionWrapper<T> = Collection<CSType<T>, MappingsWrapper<T>, MappingsMetaWrapper<T>>

export type QueryCallback<T> = (where: QueryBuilder<CSType<T>, MappingsWrapper<T>>) => Query<CSType<T>, MappingsWrapper<T>>
export type CollectionQueryOptions<T> = QueryOptions<CSType<T>, MappingsWrapper<T>>
export type QueryCallbackOrOptions<T> = QueryCallback<T> | CollectionQueryOptions<T>


/*
 * Interface for a `RecordMapper` which provides functions to convert CipherStash IDs
 * to IDs in an existing system (say numeric IDs in a Prisma model).
 * 
 * This is most likely a join table in your existing database which maps an integer ID to
 * a CipherStash ID.
 * 
 * ```
 * | --- id --- | -------------- stashId ------------- |
 * | -----------| -------------------------------------|
 * |    100     | 22d03832-10e1-41cf-9790-4efa228d546a |
 * ```
 */
export interface RecordMapper {
  /*
   * Set the given stashId on the record with primary key=id
   */
  setStashId: (record: {id: number}, stashId: string | null) => void,

  /*
   * Find all the coresponding stashIds for records with the given ids
   */
  findStashIdsFor: (id: Array<number>) => Promise<Array<string>>,

  /*
   * Create a new record and assign it the given stashId.
   * Useful when the existing database generates its own IDs (say with a sequence).
   */
  newIdFor: (stashId: string) => Promise<number>
}

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
 * A mapper is used to link CipherStash generated IDs to whatever ID scheme is used in the rest of the system.
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
export class CollectionAPI<T extends { id: number, stashId?: string | null }> {
  #collection: Promise<CollectionWrapper<T>>
  #recordMapper: RecordMapper

  constructor(name: string, plaintextStore: RecordMapper) {
    this.#recordMapper = plaintextStore
    /* Keep a promise to load the collection. The first time we await this will resolve.
     * Subsequent awaits will just pass through the resolved promise. */
    this.#collection = Stash.connect()
      .then(stash => stash.loadCollection<CSType<T>>(name))
  }

  async create(record: Omit<T, "id" | "stashId">): Promise<T> {
    const cln = await this.#collection

    const stashId = uuidv4()
    let newId = await this.#recordMapper.newIdFor(stashId)
    await cln.put({...record, id: stashId, originalId: newId} as CSType<T>)
    return {...record, id: newId, stashId } as unknown as T
  }

  /*
   * Wrapper for `Collection.put` but takes a numeric ID
   * and returns `T`.
   * 
   * See also https://docs.cipherstash.com/tsdoc/classes/_cipherstash_stashjs.Collection.html#get
   */
  async put(record: T): Promise<T> {
    const cln = await this.#collection

    // FIXME: Do this in a transaction
    if (record.stashId) {
      await cln.put({
        ...record,
        id: record.stashId,
        originalId: record.id
      })
      return record
    } else {
      const stashId = uuidv4()
      await cln.put({...record, id: stashId, originalId: record.id})
      await this.#recordMapper.setStashId(record, stashId)
      return {...record, stashId}
    }
  }

  /*
   * Wrapper for `Collection.get` but takes a numeric ID
   * and returns `T`.
   * 
   * See also https://docs.cipherstash.com/tsdoc/classes/_cipherstash_stashjs.Collection.html#get
   */
  async get(id: number): Promise<T | null> {
    const cln = await this.#collection
    let stashIds = await this.#recordMapper.findStashIdsFor([id])
  
    if (stashIds && stashIds[0]) {
      const result = await cln.get(stashIds[0])
      if (result) {
        return { ...result, stashId: result.id, id } as unknown as T
      }
    }
    return null
  }

  async getAll(ids: Array<number>): Promise<Array<T>> {
    const cln = await this.#collection
    let stashIds = await this.#recordMapper.findStashIdsFor(ids)
    let results = await cln.getAll(stashIds)

    return results.map((record) => {
      const originalId = record.originalId
      delete (record as any).originalId
      return {...record, stashId: record.id, id: originalId} as unknown as T
    })
  }

  async delete(id: number) {
    const cln = await this.#collection
    let stashIds = await this.#recordMapper.findStashIdsFor([id])
  
    if (stashIds.length == 0) return
    if (!stashIds[0]) return

    await cln.delete(stashIds[0])
    await this.#recordMapper.setStashId({id}, null)
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
}

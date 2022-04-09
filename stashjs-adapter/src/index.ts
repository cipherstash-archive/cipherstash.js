import { Stash, Collection, Mappings, MappingsMeta } from "@cipherstash/stashjs"
import { v5 as uuidv5 } from 'uuid'

export type CSType<T> = Omit<T, "id"> & { originalId: number, id: string }
type MappingsWrapper<T> = Mappings<CSType<T>>
type MappingsMetaWrapper<T> = MappingsMeta<MappingsWrapper<T>>
type CollectionWrapper<T> = Collection<CSType<T>, MappingsWrapper<T>, MappingsMetaWrapper<T>>

export class CollectionAPI<T extends { id: number }> {
  collection: Promise<CollectionWrapper<T>>;
  idNamespace: string;

  constructor(name: string, idNamespace: string) {
    this.idNamespace = idNamespace
    this.collection = Stash.connect()
      .then(stash => stash.loadCollection<CSType<T>>(name))
  }

  async put(record: T): Promise<string> {
    let mappedId = uuidv5(`${record.id}`, this.idNamespace)
    const cln = await this.collection

    return await cln.put({
      ...record,
      id: mappedId,
      originalId: record.id
    })
  }

  async get(id: number): Promise<T> {
    let mappedId = uuidv5(`${id}`, this.idNamespace)
    const cln = await this.collection
    let record = await cln.get(mappedId)

    if (record) {
      return { ...record, id: id } as unknown as T
    } else {
      throw(`No record with id=${id}`)
    }
  }

  // TODO: Make this return Promise<Array<T>> too
  query: CollectionWrapper<T>["query"] = async (...params) => (
    (await this.collection).query(...params)
  )

  async list(): Promise<Array<T>> {
    return await this.query({})
    .then(results => results.documents.map(record => (
      { ...record, id: record.originalId } as unknown as T
    )))
  }
}


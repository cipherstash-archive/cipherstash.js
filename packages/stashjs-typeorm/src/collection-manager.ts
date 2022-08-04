import { Mappings, Stash } from "@cipherstash/stashjs"
import { CollectionSchemaWrapper, CollectionWrapper, Indexed } from "./types"

type CollectionCache = {
  [key: string]: any //CollectionWrapper<any> FIXME: Don't use any
}

class CollectionManagerSingleton {
  private cache: CollectionCache
  private stash?: Promise<Stash>

  constructor() {
    this.cache = {}
  }

  private async getStash(): Promise<Stash> {
    if (this.stash) return this.stash
    // TODO: pass options
    this.stash = Stash.connect()
    return this.getStash()
  }

  async getCollection<T>(name: string): Promise<CollectionWrapper<T>> {
    if (this.cache[name]) return this.cache[name]
    const stash = await this.getStash()
    const collection = await stash.loadCollection<T, Mappings<T>>(name)
    this.cache[name] = collection
    return collection
  }

  async create(schema: CollectionSchemaWrapper): Promise<CollectionWrapper<Indexed>> {
    const stash = await this.getStash()
    return stash.createCollection(schema)
  }

  async drop(name: string): Promise<void> {
    const stash = await this.getStash()
    await stash.deleteCollection(name)
  }
}

export const CollectionManager = new CollectionManagerSingleton()

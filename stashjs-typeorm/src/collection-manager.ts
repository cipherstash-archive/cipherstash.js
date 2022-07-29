import { Stash } from "@cipherstash/stashjs"
import { Mappings, MappingsMeta, Collection } from "@cipherstash/stashjs"
import { EntityTarget } from "typeorm"
import { CollectionProxy } from "./collection-proxy"

// TODO: Move these to a common file
type Indexed<T> = Omit<T, "id"> & { id: string }
type MappingsWrapper<T> = Mappings<T>
type MappingsMetaWrapper<T> = MappingsMeta<MappingsWrapper<T>>
type CollectionWrapper<T> = Collection<T, MappingsWrapper<T>, MappingsMetaWrapper<T>>

type CollectionCache = {
  [key: string]: CollectionProxy<any>
}

class CollectionManagerSingleton {
  private cache: CollectionCache
  private stash?: Stash

  constructor() {
    this.cache = {}
  }

  private async getStash(): Promise<Stash> {
    if (this.stash) return this.stash
    // TODO: pass options
    return await Stash.connect().then(s => (this.stash = s))
  }

  async get<T>(entityTarget: EntityTarget<T>): Promise<CollectionProxy<T>> {
    const stash = await this.getStash()
    // TODO: Extract collection name out of proxy
    const proxy = new CollectionProxy(stash, entityTarget)
    let name = proxy.collectionName()
    if (this.cache[name]) return this.cache[name]
    this.cache[name] = proxy
    return proxy
  }
}

export const CollectionManager = new CollectionManagerSingleton()

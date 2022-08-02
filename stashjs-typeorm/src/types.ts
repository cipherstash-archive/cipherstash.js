import { Collection, CollectionSchema, Mappings, MappingsMeta } from "@cipherstash/stashjs"
import { TermType } from "@cipherstash/stashjs/dist/record-type-definition"

export type Indexed = {
  [key: string]: TermType
}

export type MappingsWrapper<T> = Mappings<T>
export type MappingsMetaWrapper<T> = MappingsMeta<MappingsWrapper<T>>
export type CollectionWrapper<T> = Collection<T, MappingsWrapper<T>, MappingsMetaWrapper<T>>
export type CollectionSchemaWrapper = CollectionSchema<Indexed, MappingsWrapper<Indexed>, MappingsMetaWrapper<Indexed>>

// Type which may have stashID set
export type StashLinkable = { stashId?: string; id: number | string }

// Type of data actually stored in CipherStash
export type StashedRecord = { originalId: any; id: string }

// Type which *must* have stashID set
export type StashLinked = Required<StashLinkable>

export const isStashed = (data: StashLinkable): data is StashLinked => {
  return data.hasOwnProperty("stashId")
}

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
export type StashLinkableEntity = { stashId?: string; id: number | string }

// Type of data actually stored in CipherStash
export type StashInternalRecord = { originalId: any; id: string }

// Type which *must* have stashID set
export type StashLinkedEntity = WithRequiredProperty<StashLinkableEntity, "stashId">

export const isStashed = (data: StashLinkableEntity): data is StashLinkedEntity => {
  return data.hasOwnProperty("stashId")
}

export type WithRequiredStashId<T extends { stashId?: string } | { stashId: string }> = WithRequiredProperty<
  T,
  "stashId"
>

export type WithRequiredProperty<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property]
}

import { randomUUID } from "crypto"
import { CollectionManager } from "./collection-manager"
import { StashedRecord, StashLinkable, StashLinked } from "./types"

export async function mapAndPutEntity(entity: StashLinked, collectionName: string): Promise<string> {
  try {
    const collection = await CollectionManager.getCollection<StashedRecord>(collectionName)
    const { stashId, ...record } = entity
    return await collection.put({ ...record, id: stashId, originalId: entity.id })
  } catch (e) {
    return Promise.reject(e)
  }
}

export async function deleteEntity(entity: StashLinked, collectionName: string): Promise<null> {
  try {
    const collection = await CollectionManager.getCollection<StashedRecord>(collectionName)
    return collection.delete(entity.stashId)
  } catch (e) {
    return Promise.reject(e)
  }
}

export const ensureStashID = (entity: StashLinkable) => {
  if (!entity.stashId) {
    entity.stashId = randomUUID()
  }
}

import { randomUUID } from "crypto"
import { CollectionManager } from "./collection-manager"
import { StashInternalRecord, StashLinkableEntity, StashLinkedEntity } from "./types"

export async function mapAndPutEntity(entity: StashLinkedEntity, collectionName: string): Promise<string> {
  try {
    const collection = await CollectionManager.getCollection<StashInternalRecord>(collectionName)
    const { stashId, ...record } = entity
    return await collection.put({ ...record, id: stashId, originalId: entity.id })
  } catch (e) {
    return Promise.reject(e)
  }
}

export async function deleteEntity(entity: StashLinkedEntity, collectionName: string): Promise<null> {
  try {
    const collection = await CollectionManager.getCollection<StashInternalRecord>(collectionName)
    return collection.delete(entity.stashId)
  } catch (e) {
    return Promise.reject(e)
  }
}

export const ensureStashID = (entity: StashLinkableEntity) => {
  if (!entity.stashId) {
    entity.stashId = randomUUID()
  }
}

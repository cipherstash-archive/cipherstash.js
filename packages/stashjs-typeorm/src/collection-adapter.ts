import { randomUUID } from "crypto"
import { CollectionManager } from "./collection-manager"
import { StashInternalRecord, StashLinkableEntity, StashLinkedEntity } from "./types"

export async function mapAndPutEntity(entity: StashLinkedEntity, collectionName: string): Promise<string> {
  const collection = await CollectionManager.getCollection<StashInternalRecord>(collectionName)
  const { stashId, ...record } = entity
  return await collection.put({ ...record, id: stashId, originalId: entity.id })
}

export async function deleteEntity(entity: StashLinkedEntity, collectionName: string): Promise<null> {
  const collection = await CollectionManager.getCollection<StashInternalRecord>(collectionName)
  return collection.delete(entity.stashId)
}

export const ensureStashID = (entity: StashLinkableEntity) => {
  if (!entity.stashId) {
    entity.stashId = randomUUID()
  }
}

import { HasID, Mappings, StashRecord } from "@cipherstash/stashjs"
import { randomUUID } from "crypto"
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  SoftRemoveEvent,
  RecoverEvent,
  Logger,
} from "typeorm"

import { CollectionManager } from "./collection-manager"

type Stashable = { stashId?: string }
type Stashed = Required<Stashable>

type StashSyncEvent = "insert" | "update" | "remove"

const isStashed = (data: Stashable): data is Stashed => {
  return data.hasOwnProperty("stashId")
}

const ensureStashID = (entity: Stashable) => (entity.stashId = randomUUID())

const logStashEvent = (logger: Logger, event: StashSyncEvent, stashId: string): void => {
  logger.log("info", `Stash[${event}]: ID ${stashId}`)
}

@EventSubscriber()
export class IndexingSubscriber implements EntitySubscriberInterface {
  /* Ensure stashID is set on insertion */
  beforeInsert({ entity }: InsertEvent<Stashable>): void {
    ensureStashID(entity)
  }

  /* Sync to collection after insert */
  async afterInsert(event: InsertEvent<Stashed>): Promise<void> {
    try {
      logStashEvent(event.connection.logger, "insert", event.entity.stashId)
      const collection = await CollectionManager.getCollection<StashRecord>(event.metadata.tablePath)
      const { stashId, ...record } = event.entity
      await collection.put({ ...record, id: stashId })
    } catch (e) {
      return Promise.reject(e)
    }
  }

  /* Ensure stashID is set on update */
  beforeUpdate({ entity }: UpdateEvent<Stashable>): void {
    ensureStashID(entity)
  }

  /* Sync to collection after update */
  async afterUpdate(event: UpdateEvent<Stashed>): Promise<void> {
    try {
      logStashEvent(event.connection.logger, "update", event.entity.stashId)
      const collection = await CollectionManager.getCollection<StashRecord>(event.metadata.tablePath)
      const { stashId, ...record } = event.entity
      await collection.put({ ...record, id: stashId })
    } catch (e) {
      return Promise.reject(e)
    }
  }

  /* Remove from collection after DB removal */
  async afterRemove(event: RemoveEvent<Stashable>): Promise<void> {
    try {
      if (isStashed(event.databaseEntity)) {
        logStashEvent(event.connection.logger, "remove", event.entity.stashId)
        const collection = await CollectionManager.getCollection<StashRecord>(event.metadata.tablePath)
        collection.delete(event.databaseEntity.stashId)
      }
    } catch (e) {
      return Promise.reject(e)
    }
  }

  /* Remove from collection after DB soft removal */
  async afterSoftRemove(event: SoftRemoveEvent<Stashable>): Promise<void> {
    try {
      if (isStashed(event.databaseEntity)) {
        logStashEvent(event.connection.logger, "remove", event.entity.stashId)
        const collection = await CollectionManager.getCollection<StashRecord>(event.metadata.tablePath)
        collection.delete(event.databaseEntity.stashId)
      }
    } catch (e) {
      return Promise.reject(e)
    }
  }

  /* Ensure stashID is set on recovered records */
  beforeRecover({ entity }: RecoverEvent<Stashable>): void {
    ensureStashID(entity)
  }

  /* Sync to collection after recovery */
  async afterRecover(event: RecoverEvent<Stashed>): Promise<void> {
    try {
      logStashEvent(event.connection.logger, "update", event.entity.stashId)
      const collection = await CollectionManager.getCollection<StashRecord>(event.metadata.tablePath)
      const { stashId, ...record } = event.entity
      await collection.put({ ...record, id: stashId })
    } catch (e) {
      return Promise.reject(e)
    }
  }
}

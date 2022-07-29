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

// TODO: These functions feel like they belong in the collection manager!
// TODO: Add wrapper functions in the collection manager for put and delete that take an entity
// Put a try/catch block with error logging in each of the callbacks below
const putDocument = async (entity: Required<Stashable>): Promise<void> => {
  try {
    const collection = await CollectionManager.get(entity.constructor)
    await collection.put({ ...entity, id: entity.stashId })
  } catch (e) {
    console.error(e) // TODO: Use a logger
    return Promise.reject(e) //.cause.cause.details)
  }
}

const deleteDocument = async (entity: Stashed): Promise<void> => {
  try {
    const collection = await CollectionManager.get(entity.constructor)
    await collection.delete(entity.stashId)
  } catch (e) {
    console.error(e) // TODO: Use a logger
    return Promise.reject(e) //.cause.cause.details)
  }
}

@EventSubscriber()
export class IndexingSubscriber implements EntitySubscriberInterface {
  /* Ensure stashID is set on insertion */
  beforeInsert({ entity }: InsertEvent<Stashable>): void {
    ensureStashID(entity)
  }

  /* Sync to collection after insert */
  async afterInsert(event: InsertEvent<Stashed>): Promise<void> {
    logStashEvent(event.connection.logger, "insert", event.entity.stashId)
    await putDocument(event.entity)
  }

  /* Ensure stashID is set on update */
  beforeUpdate({ entity }: UpdateEvent<Stashable>): void {
    ensureStashID(entity)
  }

  /* Sync to collection after update */
  async afterUpdate(event: UpdateEvent<Stashed>): Promise<void> {
    logStashEvent(event.connection.logger, "update", event.entity.stashId)
    await putDocument(event.entity as Stashed)
  }

  /* Remove from collection after DB removal */
  async afterRemove(event: RemoveEvent<Stashable>): Promise<void> {
    if (isStashed(event.databaseEntity)) {
      logStashEvent(event.connection.logger, "remove", event.entity.stashId)
      await deleteDocument(event.databaseEntity)
    }
  }

  /* Remove from collection after DB soft removal */
  async afterSoftRemove(event: SoftRemoveEvent<Stashable>): Promise<void> {
    if (isStashed(event.databaseEntity)) {
      logStashEvent(event.connection.logger, "remove", event.entity.stashId)
      await deleteDocument(event.databaseEntity)
    }
  }

  /* Ensure stashID is set on recovered records */
  beforeRecover({ entity }: RecoverEvent<Stashable>): void {
    ensureStashID(entity)
  }

  /* Sync to collection after recovery */
  async afterRecover(event: RecoverEvent<Stashed>): Promise<void> {
    logStashEvent(event.connection.logger, "insert", event.entity.stashId)
    await putDocument(event.entity)
  }
}

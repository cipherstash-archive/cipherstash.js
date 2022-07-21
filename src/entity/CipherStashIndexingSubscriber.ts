import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  ObjectLiteral,
  UpdateEvent,
  RemoveEvent,
  SoftRemoveEvent,
  RecoverEvent
} from 'typeorm'

@EventSubscriber()
export class CipherStashIndexingSubscriber implements EntitySubscriberInterface {
  private connections

  private getConn<T>(type: T): any { // TODO: return a connection type
    // This will take some doing - we need the type and name
    // Then we need to cache it
    stash.loadCollection<T>("movies")
  }

    /**
     * Called before post insertion.
     */
    beforeInsert(event: InsertEvent<any>) {
        console.log(`BEFORE POST INSERTED: `, event.entity)
    }

    /**
     * Called after entity insertion.
     */
    afterInsert(event: InsertEvent<any>) {
        console.log(`AFTER ENTITY INSERTED: `, event.entity)
    }

    /**
     * Called before entity update.
     */
    beforeUpdate(event: UpdateEvent<any>) {
        console.log(`BEFORE ENTITY UPDATED: `, event.metadata.targetName)
    }

    /**
     * Called after entity update.
     */
    afterUpdate(event: UpdateEvent<any>) {
        console.log(`AFTER ENTITY UPDATED: `, event.entity)
    }

    /**
     * Called after entity removal.
     */
    afterRemove(event: RemoveEvent<any>) {
        console.log(
            `AFTER ENTITY WITH ID ${event.entityId} REMOVED: `,
            event.entity,
        )
    }

    /**
     * Called after entity removal.
     */
    afterSoftRemove(event: SoftRemoveEvent<any>) {
        console.log(
            `AFTER ENTITY WITH ID ${event.entityId} SOFT REMOVED: `,
            event.entity,
        )
    }

    /**
     * Called before entity removal.
     */
    beforeRecover(event: RecoverEvent<any>) {
        console.log(
            `BEFORE ENTITY WITH ID ${event.entityId} RECOVERED: `,
            event.entity,
        )
    }

    /**
     * Called after entity removal.
     */
    afterRecover(event: RecoverEvent<any>) {
        console.log(
            `AFTER ENTITY WITH ID ${event.entityId} RECOVERED: `,
            event.entity,
        )
    }

  /*
    afterTransactionRollback(event: TransactionRollbackEvent) {
        console.log(`AFTER TRANSACTION ROLLBACK: `, event)
    }
    */
}

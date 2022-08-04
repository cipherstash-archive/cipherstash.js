import { Repository } from "typeorm"
import { collectionSchema } from "./schema-builder"
import { CollectionManager } from "./collection-manager"
import { StashLinkableEntity, WithRequiredStashId } from "./types"
import { ensureStashID, mapAndPutEntity } from "./collection-adapter"
import { extendQueryBuilder, LookasideSelectQueryBuilder } from "./query"

/*
 * Extends a TypeORM Repository to give it special powers.
 * That is, queryable encryption via a CipherStash collection.
 */
export type WrappedRepository<T extends StashLinkableEntity> = Repository<T> & {
  /*
   * Creates a CipherStash collection with indexes based on the entity.
   * Any properties in the entity that have been decorated with `@Queryable()`
   * will have queryable indexes created.
   *
   * The collection will have the same name as the database table for the entity.
   */
  createCSQueryBuilder(alias: string): LookasideSelectQueryBuilder<WithRequiredStashId<T>>
  createCollection(): Promise<void>
  dropCollection(): Promise<void>
  reindex(): Promise<void>
}

export function wrapRepo<T extends StashLinkableEntity>(repo: Repository<T>): WrappedRepository<T> {
  return repo.extend({
    createCSQueryBuilder(alias: string): LookasideSelectQueryBuilder<WithRequiredStashId<T>> {
      return extendQueryBuilder<T & { stashId: string }>(this.createQueryBuilder(alias), this.metadata.tablePath)
    },

    async createCollection(): Promise<void> {
      try {
        const schema = collectionSchema(this.metadata.target, this.metadata.tablePath)
        await CollectionManager.create(schema)
      } catch (f) {
        return Promise.reject(f.cause.cause.cause) // FIXME: WTAF errors?
      }
    },

    /*
     * Drops any coresponding CipherStash collection for the entity
     */
    async dropCollection(): Promise<void> {
      try {
        await CollectionManager.drop(this.metadata.tablePath)
      } catch (e) {
        return Promise.reject(e)
      }
    },

    /*
     * Reindexes all entity records into the CipherStash collection.
     * Only typically needed when adding CipherStash to an existing app
     * or when reindexing (say after adding/remove queryable properties on the entity).
     */
    async reindex(): Promise<void> {
      //const logger = this.manager.connection.logger

      // FIXME: Use stream instead
      const results = await this.createQueryBuilder("user").getMany()

      for (let element of results) {
        ensureStashID(element)
        await mapAndPutEntity(element, this.metadata.tablePath)
        // TODO: Get logger working
        //logger.info(`Stash[reindex]: ID ${stashId}`)
        console.log(`Stash[reindex]: ID ${element.stashId}`)
      }
    },
  })
}

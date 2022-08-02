import { Repository } from "typeorm"
import { collectionSchema } from "./schema-builder"
import { CollectionManager } from "./collection-manager"
import { StashLinkedEntity } from "./types"
import { ensureStashID, mapAndPutEntity } from "./collection-adapter"
import { extendQueryBuilder, LookasideSelectQueryBuilder } from "./query"

export function wrapRepo<T extends StashLinkedEntity>(repo: Repository<T>) {
  return repo.extend({
    createCSQueryBuilder(alias: string): LookasideSelectQueryBuilder<T> {
      return extendQueryBuilder<T>(this.createQueryBuilder(alias), this.metadata.tablePath)
    },

    async createCollection(): Promise<void> {
      try {
        const schema = collectionSchema(this.metadata.target, this.metadata.tablePath)
        await CollectionManager.create(schema)
      } catch (f) {
        return Promise.reject(f.cause.cause.cause) // FIXME: WTAF errors?
      }
    },

    async dropCollection(): Promise<void> {
      try {
        await CollectionManager.drop(this.metadata.tablePath)
      } catch (e) {
        return Promise.reject(e)
      }
    },

    async reindex(): Promise<void> {
      //const logger = this.manager.connection.logger

      // FIXME: Use stream instead
      const results = await this.createQueryBuilder("user").getMany()

      results.forEach(async element => {
        ensureStashID(element)
        await mapAndPutEntity(element, this.metadata.tablePath)
        // TODO: Get logger working
        //logger.info(`Stash[reindex]: ID ${stashId}`)
        console.log(`Stash[reindex]: ID ${element.stashId}`)
      })
    },
  })
}

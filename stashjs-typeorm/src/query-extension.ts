import { Collection, CollectionSchema, Mappings, MappingsMeta, MatchOptions, StashRecord } from "@cipherstash/stashjs"
import { TermType } from "@cipherstash/stashjs/dist/record-type-definition"
import { unreachable } from "@cipherstash/stashjs/dist/type-utils"
import { ColumnType, getMetadataArgsStorage, QueryBuilder, SelectQueryBuilder } from "typeorm"
import { collectionSchema } from "./collection"
import { CollectionManager } from "./collection-manager"
import { ConfigurationMetadata } from "./protected-column"

interface CipherStashSelectQueryBuilder<Entity> extends SelectQueryBuilder<Entity> {
  originalGetRawAndEntities: SelectQueryBuilder<Entity>["getRawAndEntities"]
}

function buildCipherStashQuery() {
  // load the where's
  // find an appropriate index
  // create the CS query
  // Any other where's leave in place (how do we unset?)
  // repeat for ordering
}

function transform<Entity>(qb: CipherStashSelectQueryBuilder<Entity>): CipherStashSelectQueryBuilder<Entity> {
  let id = "3e092cb3-eac4-4827-8e54-6596a2d1f6df"
  return qb.where("user.stashId in (:...ids)", { ids: [id] })
}

// TODO: Rename this to RepoExtension
// Extend can be called more than once
export const QueryExtension = {
  // An alternative syntax is to use useCipherStash (a bit like useIndex now in TypeORM)
  createCSQueryBuilder<Entity>(alias: string): CipherStashSelectQueryBuilder<Entity> {
    const qb = this.createQueryBuilder(alias)
    qb.originalGetRawAndEntities = qb.getRawAndEntities
    qb.getRawAndEntities = () => {
      return transform(qb).originalGetRawAndEntities()
    }
    return qb
  },

  query() {
    // TODO: We should probably create the create and drop collection functions here
    // so that we have access to the metadata for the entity

    // This gives use the collection name
    // We can use this approach in the subscriber, too - there is actually an entity meta data field on the events
    console.log(this.metadata.tablePath)
    //console.log(CollectionManager.get(this.target.constructor))
    let id = "3e092cb3-eac4-4827-8e54-6596a2d1f6df"
    return this.wrapQueryBuilder(
      this.createQueryBuilder("user").where("user.stashId in (:...ids)", { ids: [id] }).orderBy(`CASE
              WHEN id=1 THEN 1
              WHEN id=20 THEN 2
              WHEN id=11 THEN 3
              WHEN id=14 THEN 4
              WHEN id=16 THEN 5
              WHEN id=15 THEN 6
              ELSE 7
              END
            `)
    )
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
      const collection = await CollectionManager.getCollection<StashRecord>(this.metadata.tablePath)
      const { stashId, ...record } = element

      // TODO: Get logger working
      //logger.info(`Stash[reindex]: ID ${stashId}`)
      console.log(`Stash[reindex]: ID ${stashId}`)

      await collection.put({ ...record, id: stashId })
    })
  },
}

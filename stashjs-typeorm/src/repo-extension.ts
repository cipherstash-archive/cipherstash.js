import { Mappings, MappingsMeta, MatchOptions, QueryBuilder, QueryOptions, StashRecord } from "@cipherstash/stashjs"

import { Repository, SelectQueryBuilder } from "typeorm"
import { collectionSchema } from "./schema-builder"
import { CollectionManager } from "./collection-manager"
import { StashLinkable, StashedRecord, StashLinked } from "./types"
import { ensureStashID, mapAndPutEntity } from "./collection-adapter"
import { QueryExpressionMap } from "typeorm/query-builder/QueryExpressionMap"
import { off } from "process"
import { NoDefaultProfileSet } from "@cipherstash/stashjs/dist/errors"

interface CipherStashSelectQueryBuilder<T extends StashLinked> extends SelectQueryBuilder<T> {
  originalGetRawAndEntities: SelectQueryBuilder<T>["getRawAndEntities"]
  query(callback: QueryBuilder<StashRecord, Mappings<StashRecord>>): CipherStashSelectQueryBuilder<T>
  stashBuilder?: QueryBuilder<StashRecord, Mappings<StashRecord>>
}

// TODO: We may want to handle skip and take, too
function queryOptionsFromExpressionMap<T>({ limit, offset }: QueryExpressionMap): QueryOptions<T, Mappings<T>> {
  return { limit, offset }
}

function tranformSelectQuery<T extends StashLinked>(
  target: CipherStashSelectQueryBuilder<T>,
  stashIds: Array<string>,
  alias: string
): CipherStashSelectQueryBuilder<T> {
  return target
    .limit(undefined)
    .offset(undefined)
    .skip(undefined)
    .take(undefined)
    .where(`${alias}.stashId in (:...ids)`, { ids: stashIds }) // FIXME: SQLi vuln?? - does TypeORM have this issue anyway!?
}

function extend<T extends StashLinked>(
  target: SelectQueryBuilder<T>,
  collectionName: string
): CipherStashSelectQueryBuilder<T> {
  const getRawAndEntities = target.getRawAndEntities
  const newQb = { ...target, originalGetRawEntities: target.getRawAndEntities }
  const output = target as CipherStashSelectQueryBuilder<T>
  output.originalGetRawAndEntities = target.getRawAndEntities

  output.getRawAndEntities = async () => {
    const options = queryOptionsFromExpressionMap(output.expressionMap)
    const collection = await CollectionManager.getCollection(collectionName)
    const stashResults = await collection.query(output.stashBuilder, options)
    const stashIds = stashResults.documents.map(result => result.id)

    // Transform query and load the data
    return await tranformSelectQuery(output, stashIds, output.alias).originalGetRawAndEntities()
  }

  // TODO: Can we make this cleaner with bind?
  output.query = stashBuilder => {
    output.stashBuilder = stashBuilder
    return output
  }
  return output
}

// TODO: Does the extension _actually_ need to be generic? TS is structural type
export function wrapRepo<T extends StashLinked>(repo: Repository<T>) {
  return repo.extend({
    // TODO: This approach will require a full query parser to process the wheres in qb.expressionMap.wheres
    createCSQueryBuilder<R extends StashedRecord>(alias: string): CipherStashSelectQueryBuilder<StashLinked> {
      const qb = extend<StashLinked>(this.createQueryBuilder(alias), this.metadata.tablePath)
      return qb
    },

    async query<R extends StashedRecord>(callback: QueryBuilder<R, Mappings<R>>): Promise<Array<StashLinked>> {
      // TODO: Don't call CS here
      const collection = await CollectionManager.getCollection(this.metadata.tablePath)
      const results = await collection.query(callback)
      return results.documents.map((doc: R) => {
        const { originalId, ...record } = doc
        return { ...record, id: doc.originalId, stashId: doc.id }
      })
    },

    queryOrig() {
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
        ensureStashID(element)
        await mapAndPutEntity(element, this.metadata.tablePath)
        // TODO: Get logger working
        //logger.info(`Stash[reindex]: ID ${stashId}`)
        console.log(`Stash[reindex]: ID ${element.stashId}`)
      })
    },
  })
}

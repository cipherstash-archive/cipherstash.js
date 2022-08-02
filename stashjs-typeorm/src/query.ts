import { Mappings, OrderingOptions, QueryBuilder, QueryOptions, StashRecord } from "@cipherstash/stashjs"
import { OrderByCondition, SelectQueryBuilder } from "typeorm"
import { QueryExpressionMap } from "typeorm/query-builder/QueryExpressionMap"
import { CollectionManager } from "./collection-manager"
import { StashInternalRecord, StashLinkedEntity } from "./types"

export interface LookasideSelectQueryBuilder<T extends StashLinkedEntity> extends SelectQueryBuilder<T> {
  originalGetRawAndEntities: SelectQueryBuilder<T>["getRawAndEntities"]
  query(callback: QueryBuilder<StashRecord, Mappings<StashRecord>>): LookasideSelectQueryBuilder<T>
  inOrderOf(stashIds: Array<string>): LookasideSelectQueryBuilder<T>
  stashBuilder?: QueryBuilder<StashRecord, Mappings<StashRecord>>
}

export function extendQueryBuilder<T extends StashLinkedEntity>(
  target: SelectQueryBuilder<T>,
  collectionName: string
): LookasideSelectQueryBuilder<T> {
  const output = target as LookasideSelectQueryBuilder<T>
  output.originalGetRawAndEntities = target.getRawAndEntities

  output.getRawAndEntities = async () => {
    console.log(output.expressionMap.allOrderBys)
    const options = queryOptionsFromExpressionMap(output.expressionMap)
    const collection = await CollectionManager.getCollection<StashInternalRecord>(collectionName)
    const { documents } = await (output.stashBuilder
      ? collection.query(output.stashBuilder, options)
      : collection.query(options))
    const stashIds = documents.map(result => result.id)

    // Transform query and load the data
    return await tranformSelectQuery(output, stashIds, output.alias).originalGetRawAndEntities()
  }

  output.query = (stashBuilder?) => {
    if (stashBuilder) output.stashBuilder = stashBuilder
    return output
  }

  output.inOrderOf = (stashIds: Array<string>) => {
    const caseLines = stashIds.reduce((str, id, count) => `${str}WHEN "stashId"='${id}' THEN ${count}\n`, "")

    return output.orderBy(`
        CASE
          ${caseLines}END
      `)
  }
  return output
}

// This maps order for any properties on the TypeORM entity (columns), to ordering on any of the indexes defined
// in the underlying collection - not sure how to do that with TypeScript, yet!
// Because the collection mapping is dynamically generated from decorators in TypeORM, I'm not sure howe can get a type
// for Queryable<T> (where T is a decorated TypeORM entity). Thus we need the "any".
function transformOrdering(allOrderBys: OrderByCondition): Array<OrderingOptions<any, Mappings<any>>> {
  return Object.entries(allOrderBys).flatMap(([columnName, optionsOrString]) => {
    const direction = typeof optionsOrString === "string" ? optionsOrString : optionsOrString.order
    // TODO: Map to <indexName>_range
    const byIndex = columnName.split(".")[1] + "_range"
    // TODO: Check that the collection has an index with this name defined (and that it supports range queries)
    // Or just handle this better in stashjs (collection-internal.ts:200)
    return { byIndex, direction }
  })
}

// TODO: We may want to handle skip and take, too
function queryOptionsFromExpressionMap<T extends StashInternalRecord, M extends Mappings<T>>({
  limit,
  offset,
  allOrderBys,
}: QueryExpressionMap): QueryOptions<T, M> {
  const order = transformOrdering(allOrderBys)
  return { limit, offset, order }
}

function tranformSelectQuery<T extends StashLinkedEntity>(
  target: LookasideSelectQueryBuilder<T>,
  ids: Array<string>,
  alias: string
): LookasideSelectQueryBuilder<T> {
  return target
    .limit()
    .offset()
    .skip()
    .take()
    .orderBy()
    .inOrderOf(ids) // TODO: This is only needed if we had an ordering option
    .where(`${alias}.stashId in (:...ids)`, { ids }) // FIXME: SQLi vuln?? - does TypeORM have this issue anyway!?
}

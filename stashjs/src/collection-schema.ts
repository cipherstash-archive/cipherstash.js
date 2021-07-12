import { StashRecord, Mappings, MappingsMeta, makeMappingsDSL, MappingsDSL, MappingOn } from "./dsl/mappings-dsl"
import { Query, QueryBuilder, OperatorsForIndex, operators } from "./dsl/query-dsl"
import { makeId } from "./utils"
import * as crypto from 'crypto'

/**
 * Class for representing a *definition* of a collection that includes a name
 * and its mappings, but has not yet been persisted to the data-service.
 */
export class CollectionSchema<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
> {

  /**
   * Metadata about the Mappings, such as encrypted indexID and encryption keys.
   */

  constructor(
    public readonly name: string,
    public readonly mappings: M,
    public readonly meta: MM
  ) { }

  /**
   * Defines a named Collection.
   *
   * @param name the name of the collection
   * @returns a function that when invoked will be passed a MappingsDSL tailored
   *          to the specific StashRecord user type and return a CollectionDefinition
   *          instance.
   */
  public static define<R extends StashRecord>(name: string) {
    return <
      M extends Mappings<R>,
      MM extends MappingsMeta<M>
    >(
      callback: (define: MappingsDSL<R>) => M
    ) => {
      const mappings = callback(makeMappingsDSL<R>())
      return new CollectionSchema<R, M, MM>(
        name,
        mappings,
        Object.fromEntries(Object.keys(mappings).map((indexName) => {
          return [
            indexName, {
              $indexName: indexName,
              $indexId: makeId().toString('hex'),
              $prf: crypto.randomBytes(16),
              $prp: crypto.randomBytes(16)
            }
          ]
        })) as MM
      )
    }
  }

  /**
   * Builds a Query that can be later executed.
   *
   * @param callback a user-supplied callback that can build a Query using the query DSL.
   * @returns a Query object
   */
  public buildQuery(callback: QueryBuilderCallback<R, M>): Query<R, M>  {
    return callback(this.makeQueryBuilder())
  }

  /**
   * Returns a QueryBuilder tailored to the Mappings defined on this Collection.
   */
  public makeQueryBuilder(): QueryBuilder<R, M> {
    const entries = Object.entries(this.mappings) as [Extract<keyof M, string>, MappingOn<R>][]
    return Object.fromEntries(
      entries.map(
        ([key, mapping]) => [key, this.operatorsFor(key, mapping)]
      )
    ) as any // FIXME: this is a type hack
  }

  /**
   * Returns an Operators object containing operator functions for the specified
   * index name and Mapping.
   */
  private operatorsFor<
    MO extends MappingOn<R>,
    N extends Extract<keyof M, string>
  >(
    indexName: N,
    mapping: MO
  ): OperatorsForIndex<R, M, N> {
    switch (mapping.matcher) {
      case "exact": return operators.exact(indexName) as OperatorsForIndex<R, M, N>
      case "range": return operators.range(indexName) as OperatorsForIndex<R, M, N>
      case "match": return operators.match(indexName) as OperatorsForIndex<R, M, N>
      case "dynamic-match": return operators.dynamicMatch(indexName) as OperatorsForIndex<R, M, N>
      case "field-dynamic-match": return operators.scopedDynamicMatch(indexName) as OperatorsForIndex<R, M, N>
    }
  }
}

export type QueryBuilderCallback<
  R extends StashRecord,
  M extends Mappings<R>
> =
  ($: QueryBuilder<R, M>) => Query<R, M>
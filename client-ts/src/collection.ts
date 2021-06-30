import { CollectionDefinition } from "./collection-definition"
import { makeMappingsDSL, Mappings, MappingsDSL, MappingsMeta, StashRecord, MappingOn } from "./dsl/mappings-dsl"
import { operators,  OperatorsForIndex,  Query, QueryBuilder } from "./dsl/query-dsl"

/**
 * Represents a persisted collection of records that can be queried & updated.
 * 
 * A Collection is parameterised by the user-defined type R and Mappings on that
 * type.
 */
export class Collection<R extends StashRecord, M extends Mappings<R>> {
  /**
   * Constructs a new Collection
   * 
   * Do not call this directly, use `Collection.define(<name>)(<callback>) instead.
   * 
   * @access private
   */
  constructor(
    public readonly id: string,
    public readonly ref: string,
    public readonly name: string,
    public readonly mappings: M,
    public readonly mappingsMeta: MappingsMeta<M>
  ) {}

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
      return new CollectionDefinition<R, M, MM>(
        name,
        callback(makeMappingsDSL<R>())
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
    }
  }
}

export type QueryBuilderCallback<
  R extends StashRecord,
  M extends Mappings<R>
> =
  ($: QueryBuilder<R, M>) => Query<R, M>
import { Collection } from "./collection"
import { StashRecord, Mappings, MappingsMeta } from "./dsl/mappings-dsl"
import { makeId } from "./utils"
import * as crypto from 'crypto'

/**
 * Class for representing a *definition* of a collection that includes a name
 * and its mappings, but has not yet been persisted to the backend. Used as an
 * argument for creating a real Collection.
 */
export class CollectionDefinition<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
> {

  /**
   * Metadata about the Mappings, such as encrypted indexID and encryption keys.
   */
  public readonly meta: MM

  constructor(
    public readonly name: string,
    public readonly mappings: M
  ) {
    this.meta = Object.fromEntries(Object.keys(mappings).map((indexName) => {
      return [
        indexName, {
          $indexName: indexName,
          $indexId: makeId().toString('hex'),
          $prf: crypto.randomBytes(16),
          $prp: crypto.randomBytes(16) 
        }
      ]
    })) as MM
  }

  /**
   * WARNING: Use for testing purposes only!
   * 
   * Instantiates a Collection without persisting it to the backend.
   *
   * @access private
   * @returns a Collection
   */
  toCollection(): Collection<R, M> {
    return new Collection<R, M>(
      "<fake-id>",
      "<fake-ref>",
      this.name,
      this.mappings,
      this.meta
    )
  }
}
import { StashProfile } from "./stash-profile";
import { ProfileOptions, StashInternal } from "./stash-internal";
import { convertPrivateApiResult } from "./result";
import { Mappings, MappingsMeta, StashRecord } from "./dsl/mappings-dsl";
import { CollectionSchema } from "./collection-schema";
import { Collection } from "./collection";

/**
 * The main entry point to the Stash API.
 *
 * ## Listing all collections
 *
 * ```typescript
 * // Connect to the Stash API and return a client
 * const stash = await Stash.connect();
 *
 * // Get a list of collections inside the current workspace
 * const collections = await stash.listCollections();
 *
 * console.log("My collections:", collections.join(', '));
 * ```
 */
export class Stash {

  private constructor(private stash: StashInternal) {}

  /**
   * Create a `StashProfile` from various options
   *
   * ## Passing profile name
   *
   * ```ts
   * // Attempt to load the profile from `~/.cipherstash/my-profile`
   * const profile = await Stash.loadProfile({ name: 'my-profile' });
   * ```
   *
   * ## Using default method
   *
   * ```ts
   * // Will attempt to load the profile in env var CS_PROFILE_NAME if it
   * // exists, or the default profile listed in ~/.cipherstash/config.json
   * const profile = await Stash.loadProfile();
   * ```
   *
   * @param opts - an optional `ProfileOptions` object for choosing the right profile
   *
   * @returns A profile that resolves with a `StashProfile`
   *
   */
  public static async loadProfile(opts?: ProfileOptions): Promise<StashProfile> {
    return convertPrivateApiResult(StashInternal.loadProfile(opts))
  }

  /**
   * Create a `StashProfile` from environment variables
   *
   * Visit the [client configuration](https://docs.cipherstash.com/reference/client-configuration.html#configuration-parameters)
   * section for a full reference.
   *
   * @returns A `StashProfile` loaded from environment variables
   *
   */
  public static loadProfileFromEnv(): StashProfile {
    return StashInternal.loadProfileFromEnv()
  }

  /**
   * Connect to CipherStash and return a CipherStash client
   *
   * ## Default profile
   *
   * ```ts
   * // Will connect to the profile in env var CS_PROFILE_NAME if it
   * // exists, or the default profile listed in ~/.cipherstash/config.json
   * const stash = await Stash.connect();
   * ```
   *
   * ## Custom profile
   *
   * ```ts
   * const profile = await Stash.loadProfile({ profileName: 'my-profile' });
   * const stash = await Stash.connect(profile);
   * ```
   *
   * @param maybeProfile - an optional `StashProfile` to use to connect to CipherStash
   *
   * @returns A promise resolving with a `Stash` client instance
   *
   */
  public static async connect(maybeProfile?: StashProfile): Promise<Stash> {
    const result = await StashInternal.connect(maybeProfile)
    if (result.ok) {
      return Promise.resolve(new Stash(result.value))
    } else {
      return Promise.reject(result.error)
    }
  }

  /**
   * Close the connection to the CipherStash
   *
   * If this method is called any subsequent calls to `Stash` methods will fail.
   */
  public close(): void {
    this.stash.close()
  }

  /**
   * Create a collection for a specified schema
   *
   * ## Create a collection with a schema json
   *
   * ```ts
   * const schemaString = fs.readFileSync('./schema.json').toString();
   * const schemaDefinition = await generateSchemaDefinitionFromJSON(schemaString);
   *
   * // Create a CipherStash schema with the name "movies" using the schema
   * // definition from "schema.json"
   * const schema = CollectionSchema
   *                    .define("movies")
   *                    .fromCollectionSchemaDefinition(schemaDefinition);
   *
   * const stash = await Stash.connect();
   *
   * // Create the movies collection using the previously defined schema
   * const movies = await stash.createCollection(schema);
   * ```
   *
   * @param schema - the `CollectionSchema` object for the collection being created
   *
   * @returns The new collection with the specified schema
   *
   */
  public async createCollection<
    R extends StashRecord,
    M extends Mappings<R>,
    MM extends MappingsMeta<M>
  >(
    schema: CollectionSchema<R, M, MM>
  ): Promise<Collection<R, M, MM>> {
    const collection = await this.stash.createCollection(schema)
    if (collection.ok) {
      return Promise.resolve(new Collection<R, M, MM>(collection.value))
    } else {
      return Promise.reject(collection.error)
    }
  }

  /**
   * Load a collection for a specified schema or name
   *
   * ## Using a name
   *
   * ```ts
   * const stash = await tash.connect();
   * const movies = await stash.loadCollection("movies");
   * ```
   *
   * @param schemaOrName - the `CollectionSchema` object or name of the collection to load
   *
   * @returns - A promise that resolves with the specified collection
   *
   */
  public async loadCollection<
    R extends StashRecord,
    M extends Mappings<R> = Mappings<R>,
    MM extends MappingsMeta<M> = MappingsMeta<M>
  >(
    schemaOrName: CollectionSchema<R, M, MM> | string
  ): Promise<Collection<R, M, MM>> {
    const collection = await this.stash.loadCollection(schemaOrName)
    if (collection.ok) {
      return Promise.resolve(new Collection<R, M, MM>(collection.value))
    } else {
      return Promise.reject(collection.error)
    }
  }

  /**
   * List all collections in the workspace
   *
   * ```ts
   * const stash = await Stash.connect();
   * const collections = await stash.listCollections();
   * console.log("My collections:", collections.join(', '));
   * ```
   *
   * @returns - An array of collection names
   *
   */
  public listCollections(): Promise<Array<string>> {
    return convertPrivateApiResult(this.stash.listCollections())
  }

  /**
   * Delete a certain collection by name
   *
   * ```ts
   * const stash = await Stash.connect();
   * await stash.deleteCollection("movies");
   * ```
   *
   * @param collectionName - the name of the collection to be deleted
   *
   */
  public deleteCollection(collectionName: string): Promise<void> {
    return convertPrivateApiResult(this.stash.deleteCollection(collectionName))
  }
}

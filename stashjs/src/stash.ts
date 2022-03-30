import { StashProfile } from "./stash-profile";
import { ProfileOptions, StashInternal } from "./stash-internal";
import { convertPrivateApiResult } from "./result";
import { Mappings, MappingsMeta, StashRecord } from "./dsl/mappings-dsl";
import { CollectionSchema } from "./collection-schema";
import { Collection } from "./collection";

export class Stash {

  private constructor(private stash: StashInternal) {}

  public static async loadProfile(opts?: ProfileOptions): Promise<StashProfile> {
    return convertPrivateApiResult(StashInternal.loadProfile(opts))
  }

  public static loadProfileFromEnv(): StashProfile {
    return StashInternal.loadProfileFromEnv()
  }

  public static async connect(maybeProfile?: StashProfile): Promise<Stash> {
    const result = await StashInternal.connect(maybeProfile)
    if (result.ok) {
      return Promise.resolve(new Stash(result.value))
    } else {
      return Promise.reject(result.error)
    }
  }

  public close(): void {
    this.stash.close()
  }

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

  public listCollections(): Promise<Array<string>> {
    return convertPrivateApiResult(this.stash.listCollections())
  }

  public deleteCollection(collectionName: string): Promise<void> {
    return convertPrivateApiResult(this.stash.deleteCollection(collectionName))
  }
}

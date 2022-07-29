import {
  Stash,
  CollectionSchema,
  ExactMappingFieldType,
  Mappings,
  MappingsMeta,
  Collection,
} from "@cipherstash/stashjs"
import { getMetadataArgsStorage, Entity, EntitySchema, ObjectLiteral, Repository, EntityTarget } from "typeorm"

type Indexed<T> = Omit<T, "id"> & { id: string }
type MappingsWrapper<T> = Mappings<T>
type MappingsMetaWrapper<T> = MappingsMeta<MappingsWrapper<T>>
type CollectionWrapper<T> = Collection<T, MappingsWrapper<T>, MappingsMetaWrapper<T>>
type CollectionSchemaWrapper<T> = CollectionSchema<T, MappingsWrapper<T>, MappingsMetaWrapper<T>>

type CsFieldTypes = "string" | "date"

// TODO: Can we do an exhaustive check with types here?
// TODO: TypeOrm doesn't abstract the underlying types so we may need to know the DB type, too
function mapType(type: string): CsFieldTypes {
  switch (type) {
    case "date":
      return "date"
    default:
      return "string"
  }
}

// TODO: Exhaustive type check?
const indexesFor = (field, csType) => {
  switch (csType) {
    case "string":
      return [makeExactFn(field, csType), makeMatchFn(field)]
    case "date":
      return [makeRangeFn(field, csType)]
  }
}

// TODO: use the function from stashjs (need to export it)
const makeExactFn = (field, fieldType) => ({ kind: "exact", field, fieldType })
const makeRangeFn = (field, fieldType) => ({ kind: "range", field, fieldType })

const makeMatchFn = field => ({
  kind: "match",
  fields: [field],
  tokenFilters: [{ kind: "downcase" }, { kind: "ngram", tokenLength: 3 }],
  tokenizer: { kind: "standard" },
})

function stashIndexes<T>(entity: EntityTarget<T>) {
  return getMetadataArgsStorage().columns.flatMap(({ options, mode, target, propertyName }) => {
    if (entity === target && options["index"] && mode === "regular") {
      const type = options.type instanceof Function ? options.type.name : options.type
      // Note that we ignore any index settings provided to the column decorator right now
      return indexesFor(propertyName, mapType(type))
    } else {
      return []
    }
  })
}

function schemaBuilder<T>(entity: EntityTarget<T>, name: string): CollectionSchemaWrapper<Indexed<EntityTarget<T>>> {
  const targets = stashIndexes(entity)

  return CollectionSchema.define<Indexed<EntityTarget<T>>>(name).fromCollectionSchemaDefinition({
    type: {
      firstName: "string",
      lastName: "string",
      dob: "date",
      stashId: "string",
    },
    indexes: {
      firstName: { kind: "exact", field: "firstName", fieldType: "string" },
    },
  })
}

export class CollectionProxy<T> {
  private cache: CollectionWrapper<Indexed<EntityTarget<T>>>

  constructor(private stash: Stash, private entityTarget: EntityTarget<T>) {}

  public async create(): Promise<CollectionWrapper<Indexed<EntityTarget<T>>>> {
    const schema = schemaBuilder(this.entityTarget, this.collectionName())

    // TODO: Cache after creation
    return await this.stash.createCollection(schema).catch(f => {
      return Promise.reject(f.cause.cause.cause) // FIXME: WTAF errors?
    })
  }

  public async drop(): Promise<void> {
    return await this.stash.deleteCollection(this.collectionName()).catch(f => {
      return Promise.reject(f.cause)
    })
  }

  public async load(): Promise<CollectionWrapper<Indexed<EntityTarget<T>>>> {
    if (this.cache) {
      return this.cache
    }

    return await this.stash
      .loadCollection<Indexed<EntityTarget<T>>>(this.collectionName())
      .then(c => {
        this.cache = c
        return c
      })
      .catch(f => Promise.reject(f.cause))
  }

  public async put(entity: Indexed<EntityTarget<T>>): Promise<string> {
    try {
      const collection = await this.load()
      return collection.put(entity)
    } catch (e) {
      console.log("ERROR in PUT", e)
      return Promise.reject(e)
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const collection = await this.load()
      return collection.delete(id)
    } catch (e) {
      Promise.reject(e)
    }
  }

  // TODO: This belongs on the repo
  /*public async reIndex(entity: EntityType): Promise<void> {
    // TODO: What type does getRepo take?
    const userRepo = AppDataSource.getRepository(User)
    let user = await userRepo.findOneBy({id: 1})
  }*/

  collectionName(): string {
    const targetTable = getMetadataArgsStorage().tables.find(table => table.target === this.entityTarget)

    return targetTable.name || this.entityTargetName()
  }

  entityTargetName(): string {
    if (this.entityTarget instanceof Function) {
      return this.entityTarget.name
    }
    if (this.entityTarget instanceof String) {
      return this.entityTarget as string
    }
    if (this.entityTarget instanceof EntitySchema) {
      return this.entityTarget.options.name
    }
    if (this.entityTarget instanceof Object && this.entityTarget.name) {
      return this.entityTarget.name
    }
    throw Error("Unable to determine collection name from entity")
  }
}

import { getMetadataArgsStorage, Entity, EntitySchema } from "typeorm"
import { AppDataSource } from "./data-source"
import { User } from "./entity/User"
import { Stash, CollectionSchema, ExactMappingFieldType } from "@cipherstash/stashjs"
import { EntitySchemaUniqueOptions } from "typeorm/entity-schema/EntitySchemaUniqueOptions"

type Indexed<T> = Omit<T, "id"> & { id: string }
// TODO: Does TypeOrm not define this?
type EntityType = string | Function

type CsFieldTypes = "string" | "date"


function stringOrFnName(entity: EntityType): string {
  return entity instanceof Function ? entity.name : entity
}

// TODO: Can we do an exhaustive check with types here?
// TODO: TypeOrm doesn't abstract the underlying types so we may need to know the DB type, too
function mapType(type: string): CsFieldTypes {
  switch(type) {
    case "date": return "date";
    default:
      return "string"
  }
}

// TODO: Exhaustive type check?
const indexesFor = (field, csType) => {
  switch (csType) {
    case "string": return [makeExactFn(field, csType), makeMatchFn(field)];
    case "date": return [makeRangeFn(field, csType)];
  }
}

// TODO: use the function from stashjs (need to export it)
const makeExactFn = (field, fieldType) => ({ kind: "exact", field, fieldType })
const makeRangeFn = (field, fieldType) => ({ kind: "range", field, fieldType })

const makeMatchFn = (field) => ({
  kind: "match",
  fields: [field],
  tokenFilters: [
    { kind: "downcase" },
    { kind: "ngram", tokenLength: 3 }
  ],
  tokenizer: { kind: "standard" }
})

function stashIndexes(entity: EntityType) {
  return getMetadataArgsStorage()
    .columns
    .flatMap(({options, mode, target, propertyName}) => {
      if (entity === target && options["index"] && mode === 'regular') {
        const type = options.type instanceof Function ? options.type.name : options.type
        // Note that we ignore any index settings provided to the column decorator right now
        return indexesFor(propertyName, mapType(type))
      } else {
        return []
      }
    })
}

function schemaBuilder<T extends EntityType>(entity: T, name: string): any {
  const targets = stashIndexes(entity)

  return CollectionSchema
    .define<Indexed<T>>(name)
    .fromCollectionSchemaDefinition({
      type: {
        firstName: "string"
      },
      indexes: {
        firstName: { kind: "exact", field: "firstName", fieldType: "string" }
      }
    })
}

class CollectionManager {
  constructor(private stash: Stash) {}

  public async create(entity: EntityType) : Promise<any> { /// TODO: return the collection type
    const schema = schemaBuilder(entity, this.collectionName(entity))

    return await this.stash
      .createCollection(schema)
      .catch((f) => {
        return Promise.reject(f.cause.cause.cause) // FIXME: WTAF errors?
      })
  }

  public async drop(entity: EntityType): Promise<void> {
    return await this.stash
      .deleteCollection(this.collectionName(entity))
      .catch((f) => {
        return Promise.reject(f.cause)
      })
  }

  private collectionName(entity: EntityType): string {
    const targetTable = getMetadataArgsStorage()
      .tables
      .find((table) => (table.target === entity))

    return targetTable.name || stringOrFnName(entity)
  }
}

AppDataSource.initialize().then(async () => {

  //console.log(stashIndexes(User))

  const stash = await Stash.connect()
  const CM = new CollectionManager(stash)
  //CM.create(User)

    const userRepo = AppDataSource.getRepository(User)
    /*const userQuery = userRepo
      .createQueryBuilder("user")
      .where("user.lastName = :name")
      .setParameters({name: "Saw"})

    console.log(userQuery.expressionMap.wheres)

    const users = await userQuery.getMany()

    console.log("Loaded users: ", users)*/


  let user = await userRepo.findOneBy({id: 1})
  user.firstName = "Dan4"
  userRepo.save(user)

}).catch(error => console.log(error))

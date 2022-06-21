import {
  describeError,
  Stash,
  CollectionSchema,
  generateSchemaDefinitionFromJSON,
} from "@cipherstash/stashjs"
import { User } from "./user"
import { readFileSync } from "fs"
import { join } from "path"

async function createCollection() {
  try {
    const stash = await Stash.connect()

    const schemaFile = readFileSync(
      join(__dirname, "./users.schema.json")
    ).toString()
    const userSchema = CollectionSchema.define<User>(
      "users"
    ).fromCollectionSchemaDefinition(
      await generateSchemaDefinitionFromJSON(schemaFile)
    )

    const users = await stash.createCollection(userSchema)
    console.log(`Collection "${users.name}" created`)
  } catch (err) {
    console.error(`Could not create collection! Reason: ${describeError(err)}`)
  }
}

createCollection()

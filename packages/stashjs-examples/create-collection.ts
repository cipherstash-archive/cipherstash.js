import {
  describeError,
  Stash,
  CollectionSchema,
  generateSchemaDefinitionFromJSON,
} from "@cipherstash/stashjs"
import { Movie } from "./movie"
import { readFileSync } from "fs"
import { join } from "path"

async function createCollection() {
  try {
    const stash = await Stash.connect()

    const schemaFile = readFileSync(
      join(__dirname, "./movies.schema.json")
    ).toString()
    const movieSchema = CollectionSchema.define<Movie>(
      "movies"
    ).fromCollectionSchemaDefinition(
      await generateSchemaDefinitionFromJSON(schemaFile)
    )

    const movies = await stash.createCollection(movieSchema)
    console.log(`Collection "${movies.name}" created`)
  } catch (err) {
    console.error(`Could not create collection! Reason: ${describeError(err)}`)
  }
}

createCollection()

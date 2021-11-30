import { describeError, Stash } from "@cipherstash/stashjs"
import { movieSchema } from "./example-schema"

async function createCollection() {
  try {
    const stash = await Stash.connect()
    const movies = await stash.createCollection(movieSchema)
    console.log(`Collection "${movies.name}" created`)
  } catch (err) {
    console.error(`Could not create collection! Reason: ${describeError(err)}`)
  }
}

createCollection()

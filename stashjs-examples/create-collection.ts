import { describeError, Stash } from "@cipherstash/stashjs"
import { movieSchema } from "./example-schema"

async function createCollection() {
  try {
    console.log({ create: 1 })
    const stash = await Stash.connect(await Stash.loadConfig())
    console.log({ create: 2 })
    const movies = await stash.createCollection(movieSchema)
    console.log({ create: 3 })
    console.log(`Collection "${movies.name}" created`)
  } catch (err) {
    console.error(`Could not create collection! Reason: ${describeError(err)}`)
  }
}

createCollection()

import { Stash, describeError } from "@cipherstash/stashjs"
import { Movie } from "./movie"

async function createCollection() {
  try {
    const stash = await Stash.connect()
    const movies = await stash.loadCollection<Movie>("movies")
    console.log(`Collection "${movies.name}" loaded`)
  } catch (err) {
    console.error(`Could not load collection! Reason: ${describeError(err)}`)
    console.error(err)
  }
}

createCollection()

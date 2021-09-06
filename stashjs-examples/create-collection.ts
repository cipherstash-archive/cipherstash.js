import { describeError, Stash } from "@cipherstash/stashjs"
import { movieSchema } from "./example-schema"

async function createCollection() {
  try {
    const configFromEnv = Stash.loadConfigFromEnv()
    const stash = await Stash.connect({
      ...configFromEnv,
      authenticationConfig: { kind: "stored-access-token", clientId: configFromEnv.authenticationConfig.clientId }
    })
    const movies = await stash.createCollection(movieSchema)
    console.log(`Collection "${movies.name}" created`)
  } catch (err) {
    console.error(`Could not create collection! Reason: ${describeError(err)}`)
  }
}

createCollection()

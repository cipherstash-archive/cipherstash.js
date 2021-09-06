import { Stash, describeError } from "@cipherstash/stashjs"
import { movieSchema } from "./example-schema"

async function createCollection() {
  try {
    const configFromEnv = Stash.loadConfigFromEnv()
    const stash = await Stash.connect({
      ...configFromEnv,
      authenticationConfig: { kind: "stored-access-token", clientId: configFromEnv.authenticationConfig.clientId }
    })
    const movies = await stash.loadCollection(movieSchema)
    console.log(`Collection "${movies.name}" loaded`)
  } catch (err) {
    console.error(`Could not load collection! Reason: ${describeError(err)}`)
    console.error(err)
  }
}

createCollection()

import { Stash  } from "@cipherstash/stashjs"

async function deleteCollection() {
  try {
    const configFromEnv = Stash.loadConfigFromEnv()
    const stash = await Stash.connect({
      ...configFromEnv,
      authenticationConfig: { kind: "stored-access-token", clientId: configFromEnv.authenticationConfig.clientId }
    })
    await stash.deleteCollection("movies")
    console.log(`Collection "movies" deleted`)
  } catch (err) {
    console.error(`Could not delete collection! Reason: ${JSON.stringify(err)}`)
  }
}

deleteCollection()

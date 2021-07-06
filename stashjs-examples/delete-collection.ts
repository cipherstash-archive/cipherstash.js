import { Stash  } from "@cipherstash/stashjs"

async function deleteCollection() {
  try {
    const stash = await Stash.connect(Stash.loadConfigFromEnv())
    await stash.deleteCollection("employees")
    console.log(`Collection "employees" deleted`)
  } catch (err) {
    console.error(`Could not delete collection! Reason: ${JSON.stringify(err)}`)
  }
}

deleteCollection()
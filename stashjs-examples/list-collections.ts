import { Stash, describeError } from "@cipherstash/stashjs"

async function listCollections() {
  try {
    const stash = await Stash.connect()
    const collectionNames = await stash.listCollections()
    console.log(`Collection names: ${collectionNames.join(", ")}`)
  } catch (err) {
    console.error(`Could not list collections! Reason: ${describeError(err)}`)
    console.error(err)
  }
}

listCollections()

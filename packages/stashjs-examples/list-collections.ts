import { Stash, describeError } from "@cipherstash/stashjs"

async function listCollections() {
  try {
    const stash = await Stash.connect()
    const collectionNames = await stash.listCollections()
    collectionNames.forEach(async name => {
      console.log(`Collection: "${name}"`)
    })
  } catch (err) {
    console.error(`Could not list collections! Reason: ${describeError(err)}`)
    console.error(err)
  }
}

listCollections()

import { Stash } from "@cipherstash/stashjs"

async function deleteCollection() {
  try {
    const stash = await Stash.connect()
    await stash.deleteCollection("users")
    console.log(`Collection "users" deleted`)
  } catch (err) {
    console.error(`Could not delete collection! Reason: ${JSON.stringify(err)}`)
  }
}

deleteCollection()

import { Stash  } from "@cipherstash/stashjs"

async function deleteCollection() {
  try {
    const stash = await Stash.connect()
    await stash.deleteCollection("movies")
    console.log(`Collection "movies" deleted`)
  } catch (err) {
    console.error(`Could not delete collection! Reason: ${JSON.stringify(err)}`)
  }
}

deleteCollection()

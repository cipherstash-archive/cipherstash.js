import { Stash, describeError } from "@cipherstash/stashjs"

async function listCollections() {
  try {
    const stash = await Stash.connect()
    const collectionNames = await stash.listCollections()
    collectionNames.forEach(async name => {
      const collection = await stash.loadCollection(name)
      console.log(`Collection: "${name}`)
      Object.entries(collection.schema.mappings).forEach(async ([mapping, settings]) => {
        console.log(`\t${mapping}`)
      })
    })
  } catch (err) {
    console.error(`Could not list collections! Reason: ${describeError(err)}`)
    console.error(err)
  }
}

listCollections()

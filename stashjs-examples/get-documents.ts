import { Stash } from "@cipherstash/stashjs"
import { movieSchema } from "./example-schema";

async function getDocuments() {
  try {
    const stash = await Stash.connect(Stash.loadConfigFromEnv())
    const movies = await stash.loadCollection(movieSchema)

    let getResult = await movies.getAll([
      Buffer.from("b36b848309384272b32ff6bbba66fae4", "hex"),
      Buffer.from("2b6d575beb794d30b545a72c05131cfa", "hex"),
      Buffer.from("22ca14c8881c4eed852c9456752f7872", "hex")
    ])
    console.log(getResult)

  } catch (err) {
    console.error(`Could not query collection! Reason: ${JSON.stringify(err)}`)
  }
}

getDocuments()

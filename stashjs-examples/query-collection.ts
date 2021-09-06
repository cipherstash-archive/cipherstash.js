import { Stash } from "@cipherstash/stashjs"
import { movieSchema, Movie } from "./example-schema";

function displayResults(result: any, name: string) {
  result.documents.forEach((movie: Movie) => {
    console.log(movie)
  })
  // TODO: print count
  console.log("--------------------------------------------------")
  console.log(name)
  console.log(`Executed in ${result.took} secs`)
  console.log("--------------------------------------------------")
}

async function queryCollection() {
  try {
    const configFromEnv = Stash.loadConfigFromEnv()
    const stash = await Stash.connect({
      ...configFromEnv,
      authenticationConfig: { kind: "stored-access-token", clientId: configFromEnv.authenticationConfig.clientId }
    })
    const movies = await stash.loadCollection(movieSchema)

    let queryResult = await movies.query(movie => movie.title.match("The Matrix"))
    displayResults(queryResult, "Match: 'The Matrix'")

    queryResult = await movies.query(movie => movie.year.gte(1995), { limit: 50, order: [{byIndex: "year", direction: "ASC"}] })
    displayResults(queryResult, "Range: After 1995")

    queryResult = await movies.query({ limit: 20, offset: 40, order: [{byIndex: "year", direction: "DESC"}] })
    displayResults(queryResult, "All: Offset 40, Order by year DESC")

    queryResult = await movies.query({})
    displayResults(queryResult, "All")

  } catch (err) {
    console.error(`Could not query collection! Reason: ${JSON.stringify(err)}`)
  }
}

queryCollection()

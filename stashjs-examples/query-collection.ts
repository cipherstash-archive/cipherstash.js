import { Stash } from "@cipherstash/stashjs"
import { movieSchema, Movie } from "./example-schema";

function displayResults(result: any) {
  result.documents.forEach((movie: Movie) => {
    console.log({
      title: movie.title,
      year: movie.year,
      runningTime: movie.runningTime
    })
  })
  // TODO: print count
  console.log("--------------------------------------------------")
  console.log(`Executed in ${result.took} secs`)
  console.log("--------------------------------------------------")
}

async function queryCollection() {
  try {
    const stash = await Stash.connect(Stash.loadConfigFromEnv())
    const movies = await stash.loadCollection(movieSchema)

    let queryResult = await movies.query(movie => movie.title.match("BLIN amb"))
    displayResults(queryResult)

    queryResult = await movies.query(movie => movie.year.gte(2019), { limit: 50, order: [{byIndex: "year", direction: "ASC"}] })
    displayResults(queryResult)

    queryResult = await movies.query({ limit: 50, order: [{byIndex: "year", direction: "DESC"}] })
    displayResults(queryResult)

    queryResult = await movies.query()
    displayResults(queryResult)

  } catch (err) {
    console.error(`Could not query collection! Reason: ${JSON.stringify(err)}`)
  }
}

queryCollection()

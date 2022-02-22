import { HasID, QueryResult, Stash } from "@cipherstash/stashjs"
import { movieSchema, Movie } from "./example-schema";

function displayResults(result: QueryResult<Movie & HasID>, name: string) {
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
    const stash = await Stash.connect()
    const movies = await stash.loadCollection(movieSchema)

    //console.log("GET", await movies.get("f38fd75e-1826-4632-a4ea-a5fa14662d12"))

    let queryResult = await movies.query(movie => movie.title.match("arab"))
    displayResults(queryResult, "Match: 'The Matrix'")

      /*let queryResult = await movies.query(movie => movie.year.gt(1995), { limit: 5, order: [{byIndex: "year", direction: "ASC"}] })
    displayResults(queryResult, "Range: After 1995")

      /*let queryResult = await movies.query({ limit: 10, offset: 40, order: [{byIndex: "year", direction: "ASC"}] })
    displayResults(queryResult, "All: Offset 40, Order by year DESC")*/

    queryResult = await movies.query({})
    displayResults(queryResult, "All")

  } catch (err) {
    console.error(err)
    console.error(`Could not query collection! Reason: ${JSON.stringify(err)}`)
  }
}

queryCollection()

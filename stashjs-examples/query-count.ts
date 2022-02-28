import { HasID, QueryResult, Stash } from "@cipherstash/stashjs"
import { movieSchema, Movie } from "./example-schema";
import { displayResults } from "./query-helper";

async function queryCollection() {
  try {
    const stash = await Stash.connect()
    const movies = await stash.loadCollection(movieSchema)

    let queryResult = await movies.query(
      movie => movie.year.lte(1960), {
        aggregation: [{ofIndex: "exactTitle", aggregate: "count"}],
        skipResults: true
      }
    )
    displayResults(queryResult, "Range: Before 1960")


  } catch (err) {
    console.error(err)
    console.error(`Could not query collection! Reason: ${JSON.stringify(err)}`)
  }
}

queryCollection()

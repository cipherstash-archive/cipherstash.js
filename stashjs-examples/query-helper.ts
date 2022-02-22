import { HasID, QueryResult, Stash } from "@cipherstash/stashjs"
import { movieSchema, Movie } from "./example-schema";

export function displayResults(result: QueryResult<Movie & HasID>, name: string) {
  result.documents.forEach((movie: Movie) => {
    console.log(movie)
  })
  console.log("--------------------------------------------------")
  console.log(name)
  if (result.aggregates && result.aggregates[0]) {
    let { name, value } = result.aggregates[0]
    console.log("Count:", value)
  }
  console.log(`Executed in ${result.took} secs`)
  console.log("--------------------------------------------------")
}



import { Stash } from "@cipherstash/stashjs"
import { Movie } from "./movie"

async function deleteRecord() {
  try {
    const stash = await Stash.connect()
    const employees = await stash.loadCollection<Movie>("movies")

    let queryResult = await employees.query(movie =>
      movie.exactTitle.eq("The Matrix")
    )

    if (queryResult.documents.length == 1) {
      await employees.delete(queryResult.documents[0]!.id)
      try {
        await employees.get(queryResult.documents[0]!.id)
      } catch (err: any) {
        if (err.message.match(/NOT_FOUND/)) {
          console.log("☑️  Successfully deleted record")
        } else {
          console.error(err.message)
        }
      }
    } else {
      console.error(`Unexpected result: ${JSON.stringify(queryResult)}`)
    }
  } catch (err) {
    console.error(`Could not delete record ! Reason: ${JSON.stringify(err)}`)
  }
}

deleteRecord()

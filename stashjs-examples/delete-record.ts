import { Stash  } from "@cipherstash/stashjs"
import { employeeSchema } from "./example-schema"

async function deleteRecord() {
  try {
    const stash = await Stash.connect(Stash.loadConfigFromEnv())
    const employees = await stash.loadCollection(employeeSchema)

    let queryResult = await employees.all($ => $.email.eq("ada@security4u.example"))

    if (queryResult.documents.length == 1) {
      await employees.delete(queryResult.documents[0]!.id)
      try {
        await employees.get(queryResult.documents[0]!.id)
      } catch (err) {
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
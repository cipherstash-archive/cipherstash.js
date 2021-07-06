import { Stash  } from "@cipherstash/stashjs"
import { employeeSchema } from "./example-schema"

async function deleteRecord() {
  try {
    const stash = await Stash.connect(Stash.loadConfigFromEnv())
    const employees = await stash.loadCollection(employeeSchema)

    let queryResult = await employees.all($ => $.email.eq("ada@security4u.example"))

    if (queryResult.documents.length == 1) {
      await employees.delete(queryResult.documents[0]!.id)
      const deleted = await employees.get(queryResult.documents[0]!.id)
      if (!!deleted) {
        console.log("☑️  Successfully deleted record")
      } else {
        console.error("Failed to delete record!")
      }
    } else {
      console.error(`Unexpected result: ${JSON.stringify(queryResult)}`)
    }
  } catch (err) {
    console.error(`Could not deleteRecord collection! Reason: ${JSON.stringify(err)}`)
  }
}

deleteRecord()
import { Session  } from "@cipherstash/client-ts"
import { employeeSchema } from "./example-schema"

async function deleteRecord() {
  try {
    const session = await Session.connect(Session.loadConfigFromEnv())
    const employees = await session.loadCollection(employeeSchema)

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
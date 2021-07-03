import { Session  } from "@cipherstash/client-ts"
import { employeeSchema } from "./example-schema"

async function deleteRecord() {
  try {
    const session = await Session.connect(Session.loadConfigFromEnv())
    const employees = await session.loadCollection(employeeSchema)

    let results = await employees.all(where => where.email.eq("ada@security4u.example"), 1)

    if (results.length == 1) {
      await employees.delete(results[0]!.id)
      const deleted = await employees.get(results[0]!.id)
      if (!!deleted) {
        console.log("☑️  Successfully deleted record")
      } else {
        console.error("Failed to delete record!")
      }
    } else {
      console.error(`Unexpected result: ${JSON.stringify(results)}`)
    }
  } catch (err) {
    console.error(`Could not deleteRecord collection! Reason: ${JSON.stringify(err)}`)
  }
}

deleteRecord()
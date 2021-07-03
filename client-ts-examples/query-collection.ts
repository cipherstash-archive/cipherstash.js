import { Session } from "@cipherstash/client-ts"
import { employeeSchema } from "./example-schema";

async function queryCollection() {
  try {
    const session = await Session.connect(Session.loadConfigFromEnv())
    const employees = await session.loadCollection(employeeSchema)

    let results = await employees.all($ => $.email.eq("ada@security4u.example"), 1)

    if (results.length == 1 && results[0]!.name == "Ada Lovelace") {
      console.log("☑️  Successfully queried via exact mapping")
    } else {
      console.error(`Unexpected result: ${JSON.stringify(results)}`)
    }

    results = await employees.all($ =>
      $.dateOfBirth.between(
        new Date(Date.parse("1852-11-27")),
        new Date(Date.parse("1917-12-09"))
      )
    , 3)

    console.log({ results: JSON.stringify(results) })

    if (results.length == 3) {
      console.log("☑️  Successfully queried via range mapping!")
    } else {
      console.error(`Unexpected result: ${JSON.stringify(results)}`)
    }
  } catch (err) {
    console.error(`Could not query collection! Reason: ${JSON.stringify(err)}`)
  }
}

queryCollection()
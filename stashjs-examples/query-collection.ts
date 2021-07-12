import { Stash } from "@cipherstash/stashjs"
import { employeeSchema } from "./example-schema";

async function queryCollection() {
  try {
    const stash = await Stash.connect(Stash.loadConfigFromEnv())
    const employees = await stash.loadCollection(employeeSchema)

    let queryResult = await employees.all($ => $.email.eq("ada@security4u.example"))

    if (queryResult.documents.length == 1 && queryResult.documents[0]!.name == "Ada Lovelace") {
      console.log("☑️  Successfully queried using an `Exact` mapping")
    } else {
      console.error(`Unexpected result: ${JSON.stringify(queryResult)}`)
    }

    queryResult = await employees.all($ =>
      $.dateOfBirth.between(
        new Date(Date.parse("1852-11-27")),
        new Date(Date.parse("1917-12-09"))
      )
    )

    if (queryResult.documents.length == 3) {
      console.log("☑️  Successfully queried using a `Range` mapping!")
    } else {
      console.error(`Unexpected result: ${JSON.stringify(queryResult)}`)
    }

    queryResult = await employees.all($ =>
      $.dateOfBirth.between(
        new Date(Date.parse("1852-11-27")),
        new Date(Date.parse("1917-12-09"))
      ),
      { limit: 1 }
    )

    if (queryResult.documents.length == 1) {
      console.log("☑️  Successfully queried using a `Range` mapping with a `limit` option!")
    } else {
      console.error(`Unexpected result: ${JSON.stringify(queryResult)}`)
    }

    queryResult = await employees.all($ =>
      $.dateOfBirth.between(
        new Date(Date.parse("1852-11-27")),
        new Date(Date.parse("1917-12-09"))
      ),
      { aggregation: [{ ofIndex: "dateOfBirth", aggregate: "count" }]}
    )

    if (queryResult.aggregates.length == 1 &&
        queryResult.aggregates[0]!.name == "count" &&
        queryResult.aggregates[0]!.value == 3n) {
      console.log("☑️  Successfully queried using a `Range` mapping with an `aggregate` query option!")
    } else {
      console.error(`Unexpected result: ${JSON.stringify(queryResult)}`)
    }

    queryResult = await employees.all($ => $.allStringFields1.match("Grace"))

    if (queryResult.documents.length == 1 && queryResult.documents[0]!.name == "Grace Hopper") {
      console.log("☑️  Successfully queried using a `DynamicMatch` mapper!")
    } else {
      console.error(`Unexpected result: ${JSON.stringify(queryResult)}`)
    }

    queryResult = await employees.all($ => $.allStringFields2.match("name", "hopper"))

    if (queryResult.documents.length == 1 && queryResult.documents[0]!.name == "Grace Hopper") {
      console.log("☑️  Successfully queried using a `FieldDynamicMatch` mapper!")
    } else {
      console.error(`Unexpected result: ${JSON.stringify(queryResult)}`)
    }

  } catch (err) {
    console.error(`Could not query collection! Reason: ${JSON.stringify(err)}`)
  }
}

queryCollection()
import { Stash } from "@cipherstash/stashjs"
import { employeeSchema } from "./example-schema"

async function createCollection() {
  try {
    const stash = await Stash.connect(Stash.loadConfigFromEnv())
    const employees = await stash.createCollection(employeeSchema)
    console.log(`Collection "${employees.name}" created`)
  } catch (err) {
    console.error(`Could not create collection! Reason: ${JSON.stringify(err)}`)
  }
}

createCollection()
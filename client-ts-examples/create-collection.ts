import { Session } from "@cipherstash/client-ts"
import { employeeSchema } from "./example-schema"

async function createCollection() {
  try {
    const session = await Session.connect(Session.loadConfigFromEnv())
    const employees = await session.createCollection(employeeSchema)
    console.log(`Collection "${employees.name}" created`)
  } catch (err) {
    console.error(`Could not create collection! Reason: ${JSON.stringify(err)}`)
  }
}

createCollection()
import { Session  } from "@cipherstash/client-ts"

async function deleteCollection() {
  try {
    const session = await Session.connect(Session.loadConfigFromEnv())
    await session.deleteCollection("employees")
    console.log(`Collection "employees" deleted`)
  } catch (err) {
    console.error(`Could not delete collection! Reason: ${JSON.stringify(err)}`)
  }
}

deleteCollection()
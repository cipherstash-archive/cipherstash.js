// This file contains example code that uses the Collections API.
// It currently serves as a smoke test.

const {AuthToken, Stash, Query} = require('@cipherstash/client')

const auth = new AuthToken({
  idpHost: process.env.CS_IDP_HOST,
  creds: {
    clientId: process.env.CS_CLIENT_ID,
    clientSecret: process.env.CS_SECRET
  },
  federation: {
    IdentityPoolId: process.env.CS_FEDERATED_IDENTITY_ID,
    region: 'ap-southeast-2'
  }
})

async function run() {
  try {
    const cmk = process.env.CS_DEV_CMK
    const address = process.env.CS_SERVICE_FQDN
    const clusterID = address.split('.')[0]
    const stash = await Stash.connect(address, clusterID, auth, cmk)

    // Deletion questions: delete a record by ID: yes, delete by query: not yet!
    await stash.deleteCollection("employees")
    console.log("Deleted")
  } catch(error) {
    console.error("FAILED", error)
  }
}

run()

// This file contains example code that uses the Collections API.
// It currently serves as a smoke test.

const {AuthToken, Stash} = require('@cipherstash/client')

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

    const users = await stash.collection("employees")

    await users.put({id: 101, name: "Grace Hopper", position: "Founder & CEO", salary: 250000})
    await users.put({id: 102, name: "Susan Wojcicki", position: "CPO", salary: 220000})
    await users.put({id: 103, name: "Ada Lovelace", position: "CTO", salary: 220000})
    console.log("Inserted 3 records")

  } catch(error) {
    console.error("FAILED", error)
  }
}

run()

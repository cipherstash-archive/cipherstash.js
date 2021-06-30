
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

    const users = await stash.collection("employees")

    const _user = await users.get(101)

    /* Free text search */
    let query = (new Query()).limit(10).where((q) => ({ name: q.match("grace") }))
    let result = await users.all(query.count())
    console.log("Free text", result)

    /* Free text search - aggregate only */
    result = await users.all(query.count().skipResults())
    console.log("Free text agg only", result)

    /* Keyword query */
    result = await users.all({ position: "CPO" })
    console.log("Keyword", result)

    /* Range query */
    result = await users.all(new Query().limit(10).where((q) => {
      return { salary: q.gte(230000) }
    }))
    console.log("Range", result)

  } catch(error) {
    console.error("FAILED", error)
  }
}

run()

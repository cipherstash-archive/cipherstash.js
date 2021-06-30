// This file contains example code that uses the Collections API.
// It currently serves as a smoke test.

const {AuthToken, Stash, Query} = require('@cipherstash/client')
const faker = require('faker')

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

const roles = ["CPO", "CEO", "CTO"]

function insertBatch(users, j) {
  const promises = [...Array(50).keys()].map((i) => {
    const id = (i + 1) * j
    return users.put({
      id: id,
      name: faker.name.findName(),
      position: "CPO", //roles[faker.datatype.number(2)],
      age: faker.datatype.number(100)
    })
  })
  return Promise.all(promises)
}

async function run() {
  try {
    const cmk = process.env.CS_DEV_CMK
    const address = process.env.CS_SERVICE_FQDN
    const clusterID = address.split('.')[0]
    const stash = await Stash.connect(address, clusterID, auth, cmk)

    // FIXME: for some reason the return value is not the same as when getting a collection
    const _users = await stash.createCollection("users", [
      // TODO: Rename `name` to `field`
      {name: "name", analyzer: "typeahead"},
      {name: "position", analyzer: "keyword"},
      {name: "age", analyzer: "uint"},
    ])

    console.log("☑️ Collection created");

    const users = await stash.collection("users")
    console.log("☑️ Collection retrieved");

    for (j = 1; j < 20; j++) {
      console.log("Batch: ", j)
      await insertBatch(users, j)

    }

    console.log("☑️ Inserted records into collection");

    let query = new Query().limit(50).where((q) => {
      //return { name: q.match("Dan") }
      return { age: q.gte(15) }
    })
    console.log(await users.all(query))

    await stash.deleteCollection("users")
    console.log("☑️ Deleted the collection");
  } catch(error) {
    console.error("FAILED", error)
  }
}

run()

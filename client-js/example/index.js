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

async function queryWithAssertion(collection, query, assertion) {
  const result = await collection.all(query)
  if (assertion(result)) {
    console.log("☑️ Queried the collection and got expected match");
  } else {
    console.error("❌ The query did not return the expected result")
    process.exit(1)
  }
}

async function run() {
  try {
    const cmk = process.env.CS_DEV_CMK
    const address = process.env.CS_SERVICE_FQDN
    const clusterID = address.split('.')[0]
    const stash = await Stash.connect(address, clusterID, auth, cmk)

    // FIXME: for some reason the return value is not the same as when getting a collection
    const users = await stash.createCollection("users", [
      // TODO: Rename `name` to `field`
      {name: "name", analyzer: "typeahead"},
      {name: "position", analyzer: "keyword"},
      {name: "age", analyzer: "uint"},
    ])
    console.log("☑️ Collection created")

    await users.put({id: 101, name: "Dan Draper", position: "Founder & CEO", age: 39})
    await users.put({id: 102, name: "Lindsay Holmwood", position: "CPO", age: 33})
    console.log("☑️ Inserted records into collection (via create)");

    const users2 = await stash.collection("users")
    console.log("☑️ Collection retrieved")

    await users2.put({id: 103, name: "James Sadler", position: "CTO", age: 43})
    console.log("☑️ Inserted record into collection (via load)");

    const _user = await users.get(101)
    console.log("☑️ Retrieved a record from the collection");

    await queryWithAssertion(users, new Query().limit(10).where((q) =>
      ({ name: q.match("Dan") })
    ), ({records}) =>
      records.length === 1 && records[0].name === "Dan Draper"
    )

    await queryWithAssertion(users, new Query().limit(10).where((q) =>
      ({ name: q.match("Hans Gruber") })
    ), ({records}) => records.length === 0)

    await queryWithAssertion(users, new Query().limit(10).count().where((q) =>
      ({ position: q.eq("CPO") })
    ), ({records, aggregates}) =>
      records.length === 1 && records[0].name === "Lindsay Holmwood" && aggregates.count === 1
    )

    await queryWithAssertion(users, new Query().limit(10).where((q) =>
      ({ position: q.eq("Santa's Little Helper") })
    ), ({records}) => records.length === 0)

    await queryWithAssertion(users, new Query().limit(10).where((q) =>
      ({ age: q.gte(43) })
    ), ({records}) => {
      return records.length === 1 && records[0].name === "James Sadler"
    })

    await queryWithAssertion(users, new Query().limit(10).where((q) =>
      ({ age: q.lt(20) })
    ), ({records}) => records.length === 0)

    await stash.deleteCollection("users")
    console.log("☑️ Deleted the collection")
  } catch(error) {
    console.error("FAILED", error)
  }
}

run()

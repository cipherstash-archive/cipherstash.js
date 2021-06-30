
// ## Seeds
//
// This script creates a collection with indexes and inserts some data into it.

const {AuthToken, Stash} = require('@cipherstash/client')
const faker = require("faker")

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

async function insertSeeds() {
  try {
    const cmk = process.env.CS_DEV_CMK
    const stash = await Stash.connect('localhost:50001', auth, cmk)

    await stash.createCollection("patients", [
      {name: "name", analyzer: "typeahead"},
      {name: "email", analyzer: "typeahead"},
      {name: "dob", analyzer: "uint"},
      {name: "address.street.name", analyzer: "typeahead"},
      {name: "address.city", analyzer: "typeahead"},
      {name: "address.country", analyzer: "typeahead"},
      {name: "address.state", analyzer: "typeahead"},
      {name: "address.zipcode", analyzer: "keyword"},
    ])

    // FIXME: For some reason we need to retrieve the collection here
    // when we should just be able to use the object returned by `createCollection`
    // above.
    const collection = await stash.collection("patients")

    for (let n = 0; n < 100; n++) {
      await collection.put({
        name: faker.name.findName(),
        email: faker.internet.email(),
        dob: faker.date.past().getUTCMilliseconds() / 1000,
        ['address.street.name']: faker.address.streetAddress(),
        ['address.city']: faker.address.city(),
        ['address.country']: faker.address.country(),
        ['address.state']: faker.address.state(),
        ['address.zipcode']: faker.address.zipCode()
      })
    }

  } catch(error) {
    console.error("FAILED", error)
    process.exit(1)
  }
}

insertSeeds()

const Indexer = require('./indexer')
const Mapping = require('./mapping')

const { Keyword, UInt } = require('./analysis')

test('nothing is indexed by an empty mapping', async () => {
  const mapping = new Mapping({})
  const terms = await Indexer({name: "Dan"}, mapping, null)
  expect(terms).toEqual([])
})

test('nothing is indexed when no matching fields are mapped', async () => {
  const key = Buffer.from("b7618ba68a9513a093af67a309059c4d560dbdde9c382dc08ea6d3836defed34", "hex")
  const mapping = new Mapping({
    0: { name: "email", analyzer: 'keyword', key: key }
  })

  const terms = await Indexer({name: "Dan"}, mapping)
  expect(terms).toEqual([])
})

test('mapped fields are analyzed', async () => {
  // Use keyword for all mappings as it will always give exactly one term per field
  const emailFieldKey = Buffer.from("b7618ba68a9513a093af67a309059c4d560dbdde9c382dc08ea6d3836defed34", "hex")
  const ageFieldKey = Buffer.from("28c5029dc5436d9563ea2b768a2dc03f7c0f56d7cce7dfc08af30d8e1d457a02", "hex")
  const mapping = new Mapping({
    0: { name: "email", analyzer: 'keyword', key: emailFieldKey},
    1: { name: "age", analyzer: 'uint', key: ageFieldKey},
  })

  const terms = await Indexer({email: "Dan", age: 20}, mapping)
  expect(terms).toHaveLength(2)
})

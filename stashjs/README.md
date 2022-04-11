# StashJS

StashJS is a Typescript/Javascript API for the [CipherStash](https://cipherstash.com) always-encrypted searchable datastore.

Full documentation is available at [docs.cipherstash.com](https://docs.cipherstash.com) as a well as an [examples
repo](https://github.com/cipherstash/stashjs-examples).

## Developing

StashJS is currently maintained in a private monorepo which is synced to [this repo](https://github.com/cipherstash/stashjs) when we push a new release to NPM.

We are in the process of moving StashJS (and its dependencies) out of our private monorepo and when that happens, [this repo](https://github.com/cipherstash/stashjs) will be where all development happens in the open.

### Tests

You may be wondering where all the tests are!

There are some unit tests in the StashJS repo but the bulk of the tests are are predominantly end-to-end tests against the CipherStash test infrastructure and they still live in our monorepo.

We have plans to move what tests we can to this repo and also convert some of those tests into unit tests that can be run by anyone hacking on this code.

We aren't there yet, but please be patient with us while we tease apart the necessary bits and bobs to make it happen.

## Future technical direction

The core encryption happens in a Rust package called [ore.rs](https://ore.rs). More of StashJS will be converted from TypeScript to Rust code over time so that we can provide client bindings in as many languages as possible without rebuilding the world, and to ensure *correctness* and *interoperability*.

All of the parts of StashJS that are converted to Rust will also be publicly released under a permissive open source license and developed in the open.

## Usage Examples

### Create a collection

```ts
const movieSchema = JSON.parse(`
{
  "type": {
    "title": "string",
    "runningTime": "number",
    "year": "number"
  },  
  "indexes": {
    "exactTitle": { "kind": "exact", "field": "title" },
    "runningTime": { "kind": "range", "field": "runningTime" },
    "year": { "kind": "range", "field": "year" },
    "title": {
      "kind": "match",
      "fields": ["title"],
      "tokenFilters": [
        { "kind": "downcase" },
        { "kind": "ngram", "tokenLength": 3 } 
      ],  
      "tokenizer": { "kind": "standard" }
    }   
  }
}
`)
const stash = await Stash.connect()
const movies = await stash.createCollection(movieSchema)
```

### Inserting a record

```ts
const stash = await Stash.connect()
const movies = await stash.loadCollection(movieSchema)
console.log(`Collection "${movies.name}" loaded`)

let id = await movies.put({
  title: "The Matrix",
  year: 1999,
  runningTime: 136
})
```

### Basic queries

```ts
let queryResult = await movies.query(
  movie => movie.exactTitle.eq("Lifelines"),
  { limit: 10 }
)
```

### Free text-search

```ts
let queryresult = await movies.query(
  movie => movie.title.match("star wa"),
  { limit: 10 }
)

```

### Range queries

```ts
let queryResult = await movies.query(
  movie => movie.year.lte(1940),
  { limit: 5, order: [{byIndex: "year", direction: "DESC"}] }
)
```


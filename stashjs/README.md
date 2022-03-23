# StashJS

StashJS is a Typescript/Javascript API for the [CipherStash](https://cipherstash.com) always-encrypted searchable datastore.

Full documentation is available at [docs.cipherstash.com](https://docs.cipherstash.com) as a well as an [examples
repo](https://github.com/cipherstash/stashjs-examples).

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


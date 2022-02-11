import { CollectionSchema } from './collection-schema'
import { downcase, ngram, standard } from './dsl/filters-and-tokenizers-dsl'
import { all } from './dsl/query-dsl'

type PatientRecord = {
  id: string,
  name: string,
  phone: string,
  altPhone: string,
  dob: Date,
  email: string,
  secondaryEmail: string,
  expired: boolean,
  age: number,
  notes: string,
  description: string,
  address: {
    streetNumber: string
    street: string
    city: string
    country: string
    postcode: string
  },
  prescriptions: Array<string>
}

let schema = CollectionSchema.define<PatientRecord>("patients").indexedWith(mapping => ({
  email: mapping.Exact("email"),
  age: mapping.Exact("age"),
  ageRange: mapping.Range("age"),
  dob: mapping.Exact("dob"),
  dobRange: mapping.Range("dob"),
  expired: mapping.Exact("expired"),
  city: mapping.Exact("address.city"),
  notesAndDescription: mapping.Match(["notes", "description"], {
    tokenFilters: [downcase, ngram({ tokenLength: 3 })],
    tokenizer: standard
  }),
  allStringFields1: mapping.DynamicMatch({
    tokenFilters: [downcase, ngram({ tokenLength: 3 })],
    tokenizer: standard
  }),
  allStringFields2: mapping.FieldDynamicMatch({
    tokenFilters: [downcase, ngram({ tokenLength: 3 })],
    tokenizer: standard
  })
}))

describe('CollectionSchema', () => {
  describe('define', () => {
    test('produces a schema with a name', () => {
      expect(schema.name).toBe("patients")
    })

    test('produces a schema with mappings', () => {
      expect(schema.mappings).toStrictEqual({
        email: { kind: "exact", field: "email" },
        expired: { kind: "exact", field: "expired" },
        age: { kind: "exact", field: "age" },
        dob: { kind: "exact", field: "dob" },
        dobRange: { kind: "range", field: "dob" },
        city: { kind: "exact", field: "address.city" },
        ageRange: { kind: "range", field: "age" },
        notesAndDescription: {
          kind: "match",
          fields: ["notes", "description"],
          options: {
            tokenFilters: [
              { processor: "downcase" },
              { processor: "ngram", "tokenLength": 3 }
            ],
            tokenizer: { processor: "standard" }
          }
        },
        allStringFields1: {
          kind: "dynamic-match",
          options: {
            tokenFilters: [
              {
                processor: "downcase",
              },
              {
                processor: "ngram",
                tokenLength: 3,
              },
            ],
            "tokenizer": {
              processor: "standard",
            },
          },
        },
        "allStringFields2": {
          kind: "field-dynamic-match",
          options: {
            tokenFilters: [
              {
                processor: "downcase",
              },
              {
                processor: "ngram",
                tokenLength: 3,
              },
            ],
            "tokenizer": {
              processor: "standard",
            },
          },
        },
      })
    })
  })

  describe('buildQuery', () => {
    describe('single condition queries', () => {
      test('exact mapping on string field', () => {
        let query = schema.buildQuery($ => $.email.eq("person@email.example"))
        expect(query).toStrictEqual({ kind: "exact", indexName: "email", op: "eq", value: "person@email.example" })
      })

      test('exact mapping on boolean field', () => {
        let query = schema.buildQuery($ => $.expired.eq(true))
        expect(query).toStrictEqual({ kind: "exact", indexName: "expired", op: "eq", value: true })
      })

      test('exact mapping on number field', () => {
        let query = schema.buildQuery($ => $.age.eq(43))
        expect(query).toStrictEqual({ kind: "exact", indexName: "age", op: "eq", value: 43 })
      })

      test('exact mapping on date field', () => {
        let date: Date = new Date(Date.UTC(2021, 6, 1))
        let query = schema.buildQuery($ => $.dob.eq(date))
        expect(query).toStrictEqual({ kind: "exact", indexName: "dob", op: "eq", value: date })
      })

      test('range mapping on date field', () => {
        let date1: Date = new Date(Date.UTC(2021, 6, 1))
        let date2: Date = new Date(Date.UTC(2022, 6, 1))
        let query = schema.buildQuery($ => $.dobRange.between(date1, date2))
        expect(query).toStrictEqual({ kind: "range", indexName: "dobRange", op: "between", min: date1, max: date2 })
      })

      test('range mapping on number field', () => {
        let number1 = 10
        let number2 = 100
        let query = schema.buildQuery($ => $.ageRange.between(number1, number2))
        expect(query).toStrictEqual({ kind: "range", indexName: "ageRange", op: "between", min: number1, max: number2 })
      })

      test('match mapping on string field', () => {
        let query = schema.buildQuery($ => $.notesAndDescription.match("diabetes"))
        expect(query).toStrictEqual({ kind: "match", op: "match", indexName: "notesAndDescription", value: "diabetes" })
      })

      test('dynamic match mapping without search by field', () => {
        let query = schema.buildQuery($ => $.allStringFields1.match("London"))
        expect(query).toStrictEqual({ kind: "dynamic-match", op: "match", indexName: "allStringFields1", value: "London" })
      })

      test('dynamic match mapping with search by field', () => {
        let query = schema.buildQuery($ => $.allStringFields2.match("address.city", "London"))
        expect(query).toStrictEqual({ kind: "field-dynamic-match", op: "match", indexName: "allStringFields2", fieldName: "address.city", value: "London" })
      })
    })

    describe('conjunctive queries', () => {
      test('all (logical and)', () => {
        let query = schema.buildQuery($ => all($.expired.eq(true), $.notesAndDescription.match('diabetes')))
        expect(query).toStrictEqual({
          kind: "all",
          conditions: [
            { indexName: "expired", kind: "exact", op: "eq", value: true },
            { indexName: "notesAndDescription", kind: "match", op: "match", value: "diabetes"  }
          ]
        })
      })
    })
  })
})

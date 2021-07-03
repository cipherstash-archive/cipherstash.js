import { Collection } from './collection'
import { downcase, ngram, standardTokenizer } from './dsl/filters-and-tokenizers-dsl'
import { and } from './dsl/query-dsl'

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

let collection = Collection.define<PatientRecord>("patients")(mapping => ({
  email: mapping.Exact("email"),
  age: mapping.Exact("age"),
  ageRange: mapping.Range("age"),
  dob: mapping.Exact("dob"),
  dobRange: mapping.Range("dob"),
  expired: mapping.Exact("expired"),
  city: mapping.Exact("address.city"),
  notesAndDescription: mapping.Match(["notes", "description"], {
    tokenFilters: [downcase, ngram({ tokenLength: 3 })],
    tokenizer: standardTokenizer({ tokenLength: 20 })
  })
})).toCollection()

describe('Collection', () => {
  describe('define', () => {
    test('produces a collection with a name', () => {
      expect(collection.name).toBe("patients")
    })

    test('produces a collection with mappings', () => {
      expect(collection.mappings).toStrictEqual({
        email: { matcher: "exact", field: "email" },
        expired: { matcher: "exact", field: "expired" },
        age: { matcher: "exact", field: "age" },
        dob: { matcher: "exact", field: "dob" },
        dobRange: { matcher: "range", field: "dob" },
        city: { matcher: "exact", field: "address.city" },
        ageRange: { matcher: "range", field: "age" },
        notesAndDescription: {
          matcher: "match",
          fields: ["notes", "description"],
          tokenFilters: [
            { tokenFilter: "downcase" },
            { tokenizer: "ngram", "tokenLength": 3 }
          ],
          tokenizer: { tokenizer: "standard", tokenLength: 20 }
        },
      })
    })
  })

  describe('buildQuery', () => {
    describe('single condition queries', () => {
      test('exact mapping on string field', () => {
        let query = collection.buildQuery($ => $.email.eq("person@email.example"))
        expect(query).toStrictEqual({ kind: "exact", indexName: "email", op: "eq", value: "person@email.example" })
      })

      test('exact mapping on boolean field', () => {
        let query = collection.buildQuery($ => $.expired.eq(true))
        expect(query).toStrictEqual({ kind: "exact", indexName: "expired", op: "eq", value: true })
      })

      test('exact mapping on number field', () => {
        let query = collection.buildQuery($ => $.age.eq(43))
        expect(query).toStrictEqual({ kind: "exact", indexName: "age", op: "eq", value: 43 })
      })

      test('exact mapping on date field', () => {
        let date: Date = new Date(Date.UTC(2021, 6, 1))
        let query = collection.buildQuery($ => $.dob.eq(date))
        expect(query).toStrictEqual({ kind: "exact", indexName: "dob", op: "eq", value: date })
      })

      test('range mapping on date field', () => {
        let date1: Date = new Date(Date.UTC(2021, 6, 1))
        let date2: Date = new Date(Date.UTC(2022, 6, 1))
        let query = collection.buildQuery($ => $.dobRange.between(date1, date2))
        expect(query).toStrictEqual({ kind: "range", indexName: "dobRange", op: "between", min: date1, max: date2 })
      })

      test('range mapping on number field', () => {
        let number1 = 10
        let number2 = 100
        let query = collection.buildQuery($ => $.ageRange.between(number1, number2))
        expect(query).toStrictEqual({ kind: "range", indexName: "ageRange", op: "between", min: number1, max: number2 })
      })

      test('match mapping on string field', () => {
        let query = collection.buildQuery($ => $.notesAndDescription.match("diabetes"))
        expect(query).toStrictEqual({ kind: "match", op: "match", indexName: "notesAndDescription", value: "diabetes" })
      })
    })

    describe('conjunctive queries', () => {
      test('and', () => {
        let query = collection.buildQuery($ => and($.expired.eq(true), $.notesAndDescription.match('diabetes')))
        expect(query).toStrictEqual({ 
          kind: "and",
            cond1: { indexName: "expired", kind: "exact", op: "eq", value: true },
            cond2: { indexName: "notesAndDescription", kind: "match", op: "match", value: "diabetes"  }
          })
      })
    })
  })
})

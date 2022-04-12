import { isRight } from 'fp-ts/lib/Either'
import { parseCollectionSchemaJSON, PRIVATE } from './collection-schema-parser'

const { ExactIndexDecoder, MatchIndexDecoder, RangeIndexDecoder, parseIndexDefinition } = PRIVATE

import { isErr, isOk } from '../result'

describe("Index definition: Exact", () => {
  it("parses valid index definition", () => {
    const def = {
      "kind": "exact",
      "field": "title"
    }

    const parsed = ExactIndexDecoder.decode(def)
    expect(isRight(parsed)).toBe(true)
  })

  it("parses invalid index definition", () => {
    const def = {
      "kind": "garbage",
      "field": "title"
    }

    const parsed = ExactIndexDecoder.decode(def)
    expect(isRight(parsed)).toBe(false)
  })
})

describe("Index definition: Range", () => {
  it("parses valid index definition", () => {
    const def = {
      "kind": "range",
      "field": "title"
    }

    const parsed = RangeIndexDecoder.decode(def)
    expect(isRight(parsed)).toBe(true)
  })

  it("parses invalid index definition", () => {
    const def = {
      "kind": "garbage",
      "field": "title"
    }

    const parsed = RangeIndexDecoder.decode(def)
    expect(isRight(parsed)).toBe(false)
  })
})

describe("Index definition: Match", () => {
  it("parses valid index definition", () => {
    const def = {
      "kind": "match",
      "fields": ["title"],
      "tokenFilters": [
        { "kind": "downcase" },
        { "kind": "ngram", "tokenLength": 3 }
      ],
      "tokenizer": { "kind": "standard" }
    }

    const parsed = MatchIndexDecoder.decode(def)
    expect(isRight(parsed)).toBe(true)
  })

  it("parses invalid index definition", () => {
    const def = {
      "kind": "match",
      // Should be an array of fields
      "fields": "title",
      "tokenFilters": [
        { "kind": "downcase" },
        { "kind": "ngram", "tokenLength": 3 }
      ],
      "tokenizer": { "kind": "standard" }
    }

    const parsed = MatchIndexDecoder.decode(def)
    expect(isRight(parsed)).toBe(false)
  })
})

describe("Entire indexes definition", () => {

  it("can be parsed", () => {
    const indexes = {
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

    const parsed = parseIndexDefinition(indexes)
    expect(isOk(parsed)).toBe(true)
  })
})

describe("Parsing", () => {
  it("returns an appropriate error when input is not a valid JSON string", () => {
    const parsed = parseCollectionSchemaJSON("{ not valid JSON }")
    if (isErr(parsed)) {
      expect(parsed.error).toMatch(/^Input is not valid JSON: /)
    } else {
      fail("expected parsing to fail")
    }
  })
})

describe("Typechecking", () => {
  describe("when there are no type errors", () => {
    it("type checking should succeed", () => {
      const schema = JSON.stringify({
        "type": {
          "title": "string",
          "runningTime": "float64",
          "year": "float64"
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
      })

      const checked = parseCollectionSchemaJSON(schema)
      expect(isOk(checked)).toBe(true)
    })

    it("both number type and float64 type accepted for backwards compatibility", () => {
      const schema = JSON.stringify({
        "type": {
          "title": "string",
          "runningTime": "number",
          "year": "float64"
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
      })

      const checked = parseCollectionSchemaJSON(schema)
      expect(isOk(checked)).toBe(true)
    })
  })

  describe("when there is a match index type error", () => {
    it("type checking should fail", () => {
      const schema = JSON.stringify({
        "type": {
          "runningTime": "float64",
        },
        "indexes": {
          "title": {
            "kind": "match",
            "fields": ["runningTime"],
            "tokenFilters": [
              { "kind": "downcase" },
              { "kind": "ngram", "tokenLength": 3 }
            ],
            "tokenizer": { "kind": "standard" }
          }
        }
      })

      const checked = parseCollectionSchemaJSON(schema)
      if (checked.ok) {
        fail("type checking should have failed")
        return
      }

      expect(checked.error).toEqual(`index type "match" works on fields of type "string" but field "runningTime" is of type "float64"`)
    })
  })

  describe("when there is a range index type error", () => {
    it("type checking should fail", () => {
      const schema = JSON.stringify({
        "type": {
          "title": "string",
        },
        "indexes": {
          "title": { "kind": "range", "field": "title" }
        }
      })

      const checked = parseCollectionSchemaJSON(schema)
      if (checked.ok) {
        fail("type checking should have failed")
        return
      }

      expect(checked.error).toEqual(`index type "range" works on fields of type "float64, number, bigint, date, boolean" but field "title" is of type "string"`)
    })
  })

  describe("when there are multiple type errors", () => {
    it("type checking should fail and we only return the first encountered error", () => {
      const schema = JSON.stringify({
        "type": {
          "title": "string",
          "runningTime": "float64",
        },
        "indexes": {
          "title": { "kind": "range", "field": "title" },
          "runningTime": {
            "kind": "match",
            "fields": ["runningTime"],
            "tokenFilters": [
              { "kind": "downcase" },
              { "kind": "ngram", "tokenLength": 3 }
            ],
            "tokenizer": { "kind": "standard" }
          }
        }
      })

      const checked = parseCollectionSchemaJSON(schema)
      if (checked.ok) {
        fail("type checking should have failed")
        return
      }

      expect(checked.error).toEqual(`index type "range" works on fields of type "float64, number, bigint, date, boolean" but field "title" is of type "string"`)
    })
  })
})
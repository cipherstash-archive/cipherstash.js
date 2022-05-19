import { CollectionSchema } from "./collection-schema"
import { buildRecordAnalyzer } from "./analyzer"

describe("buildRecordAnalyzer", () => {
  type SomeRecord = {
    id: string
    exact: string
    exactOptional?: string
    range: number
    rangeOptional?: number
    match: string
    matchOptional?: string
  }

  let schema = CollectionSchema.define<SomeRecord>("blah").fromCollectionSchemaDefinition({
    type: {
      id: "string",
      exact: "string",
      exactOptional: "string",
      range: "float64",
      rangeOptional: "float64",
      match: "string",
      matchOptional: "string",
    },
    indexes: {
      exact: { kind: "exact", fieldType: "string", field: "exact" },
      exactOptional: { kind: "exact", fieldType: "string", field: "exactOptional" },
      range: { kind: "range", fieldType: "float64", field: "range" },
      rangeOptional: { kind: "range", fieldType: "float64", field: "rangeOptional" },
      match: {
        kind: "match",
        fieldType: "string",
        fields: ["match"],
        tokenFilters: [{ kind: "downcase" }],
        tokenizer: { kind: "standard" },
      },
      matchOptional: {
        kind: "match",
        fieldType: "string",
        fields: ["matchOptional"],
        tokenFilters: [{ kind: "downcase" }],
        tokenizer: { kind: "standard" },
      },
    },
  })

  let analyze = buildRecordAnalyzer(schema)

  const record: SomeRecord = {
    id: "123",
    exact: "test",
    exactOptional: "test",
    range: 123,
    rangeOptional: 123,
    match: "test",
    matchOptional: "test",
  }

  function without(field: keyof SomeRecord): any {
    let obj = Object.assign({}, record)
    delete obj[field]
    return obj
  }

  const cases: Array<[keyof SomeRecord]> = [
    ["exact"],
    ["exactOptional"],
    ["match"],
    ["matchOptional"],
    ["range"],
    ["rangeOptional"],
  ]

  test.each(cases)(
    `successfully analyzes record even when mapped field "%s" is missing in a record instance`,
    (field: keyof SomeRecord) => {
      expect(analyze(without(field))).toHaveProperty("indexEntries")
    }
  )
})

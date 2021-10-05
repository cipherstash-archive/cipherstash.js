import { CollectionSchema } from "./collection-schema"
import { buildRecordAnalyzer } from "./analyzer"
import { downcase, standard } from "./dsl/filters-and-tokenizers-dsl"


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

  let schema = CollectionSchema.define<SomeRecord>("blah").indexedWith(mappings => ({
    exact: mappings.Exact("exact"),
    exactOptional: mappings.Exact("exactOptional"),
    range: mappings.Range("range"),
    rangeOptional: mappings.Range("rangeOptional"),
    match: mappings.Match(["match"], {
      tokenFilters: [downcase],
      tokenizer: standard
    }),
    matchOptional: mappings.Match(["matchOptional"], {
      tokenFilters: [downcase],
      tokenizer: standard
    }),
  }))

  let analyze = buildRecordAnalyzer(schema)

  const record: SomeRecord = {
    id: "123",
    exact: "test",
    exactOptional: "test",
    range: 123,
    rangeOptional: 123,
    match: "test",
    matchOptional: "test"
  }

  function without(field: keyof SomeRecord): any {
    let obj = Object.assign({}, record)
    delete obj[field]
    return obj
  }

  const cases: Array<[keyof SomeRecord]> = [['exact'], ['exactOptional'], ['match'], ['matchOptional'], ['range'], ['rangeOptional']]

  test.each(cases)(
    `successfully analyzes record even when mapped field "%s" is missing in a record instance`,
    (field: keyof SomeRecord) => {
      expect(analyze(without(field))).toHaveProperty('indexEntries')
    }
  )
})
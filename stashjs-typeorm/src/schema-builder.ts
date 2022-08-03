import { CollectionSchema, MatchOptions } from "@cipherstash/stashjs"
import { TermType } from "@cipherstash/stashjs/dist/record-type-definition"
import { unreachable } from "@cipherstash/stashjs/dist/type-utils"
import { ColumnType, getMetadataArgsStorage } from "typeorm"
import { ConfigurationMetadata } from "./encrypted-column"
import { CollectionSchemaWrapper, Indexed } from "./types"

export function collectionSchema(target: any, name: string): CollectionSchemaWrapper {
  const type = indexedTypeForEntity(target)
  const indexes = indexesFor(type)

  return CollectionSchema.define<Indexed>(name).fromCollectionSchemaDefinition({ type, indexes })
}

function indexedTypeForEntity(entity: any): Indexed {
  const properties = ConfigurationMetadata.searchableColumnsFor(entity)

  return getMetadataArgsStorage().columns.reduce((output, { options, mode, target, propertyName }) => {
    if (entity === target && mode === "regular") {
      let prop = properties.find(p => p == propertyName)
      if (prop) output[propertyName] = mapType(options.type)
    }
    return output
  }, {})
}

// TODO: This logic could probably be moved into stashjs
// TODO: This should create an object
function indexesFor(indexedType: Indexed): Mapping {
  return Object.entries(indexedType).reduce((indexes, [propertyName, type]) => {
    switch (type) {
      case "string":
        // Orderable strings are lossy so we need to keep an exact index
        indexes[propertyName] = makeExactFn(propertyName, type)
        indexes[`${propertyName}_match`] = makeMatchFn(propertyName)
        indexes[`${propertyName}_range`] = makeRangeFn(propertyName, type)
        return indexes

      case "uint64":
      case "float64":
      case "date":
        indexes[`${propertyName}_range`] = makeRangeFn(propertyName, type)
        return indexes

      case "boolean":
        indexes[propertyName] = makeExactFn(propertyName, type)
        return indexes

      default:
        unreachable("Unhandled type")
    }
  }, {})
}

// TODO: use the functions from stashjs but they aren't *quite* the same
function makeExactFn(field, fieldType): ExactIndex {
  return { kind: "exact", field, fieldType }
}
const makeRangeFn = (field, fieldType): RangeIndex => ({ kind: "range", field, fieldType })
const makeMatchFn = (field): MatchIndex => ({
  kind: "match",
  fields: [field],
  fieldType: "string",
  tokenFilters: [{ kind: "downcase" }, { kind: "ngram", tokenLength: 3 }],
  tokenizer: { kind: "standard" },
})

// TODO: are these actually Mapping types from stashjs?
type ExactIndex = {
  kind: "exact"
  field: string
  fieldType: Exclude<TermType, "float64">
}

type RangeIndex = {
  kind: "range"
  field: string
  fieldType: TermType
}

type MatchIndex = MatchOptions & {
  kind: "match"
  fields: Array<string>
  fieldType: "string"
}

type Index = ExactIndex | RangeIndex | MatchIndex

type Mapping = {
  [key: string]: Index
}

const StringTypes = [
  "tinytext",
  "mediumtext",
  "text",
  "longtext",
  "shorttext",
  "alphanum",
  "character varying",
  "varying character",
  "char varying",
  "nvarchar",
  "national varchar",
  "character",
  "native character",
  "varchar",
  "char",
  "nchar",
  "national char",
  "varchar2",
  "nvarchar2",
  "alphanum",
  "shorttext",
  "raw",
  "binary",
  "varbinary",
]

const Uint64Types = ["tinyint", "smallint", "mediumint", "int", "int2", "int4", "int8", "integer", "bigint"]

const DateTypes = [
  "datetime",
  "datetime2",
  "datetimeoffset",
  "time",
  "time with time zone",
  "time without time zone",
  "timestamp",
  "timestamp without time zone",
  "timestamp with time zone",
  "timestamp with local time zone",
]

const Float64Types = ["float", "double", "double precision"]

type StringType = StringConstructor | typeof StringTypes[number]
type DateType = DateConstructor | typeof DateTypes[number]
type BooleanType = BooleanConstructor | "boolean" | "bool"
type Uint64Type = typeof Uint64Types[number]
type Float64Type = NumberConstructor | typeof Float64Types[number]
type TargetType = ColumnType | string

// TODO: We really need a decimal/fixed precision type

function isStringType(type: TargetType): type is StringType {
  return type === String || StringTypes.includes(type as typeof StringTypes[number])
}

function isDateType(type: TargetType): type is DateType {
  return type === Date || DateTypes.includes(type as typeof DateTypes[number])
}

function isUint64Type(type: TargetType): type is Uint64Type {
  return Uint64Types.includes(type as Uint64Type)
}

function isBooleanType(type: TargetType): type is BooleanType {
  return type === Boolean || type === "boolean" || type === "bool"
}

function isFloat64Type(type: TargetType): type is Float64Type {
  return type === Number || Float64Types.includes(type as typeof Float64Types[number])
}

function mapType(type: TargetType): TermType {
  if (isStringType(type)) return "string"
  if (isDateType(type)) return "date"
  if (isUint64Type(type)) return "uint64"
  if (isBooleanType(type)) return "boolean"
  if (isFloat64Type(type)) return "float64"
  throw new Error(`Type ${type} is unsuppored for queryable encryption`)
}

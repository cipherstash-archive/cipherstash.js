
export type RecordTypeDefinition = {
  [key: string]:
    | "string"
    | "float64"
    | "number"
    | "bigint"
    | "uint64"
    | "date"
    | "boolean"
    | RecordTypeDefinition
}
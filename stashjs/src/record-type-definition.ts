
export type TermType =
    | "string"
    | "float64"
    | "number"
    | "bigint"
    | "uint64"
    | "date"
    | "boolean"

export type RecordTypeDefinition = {
  [key: string]: |TermType | RecordTypeDefinition
}
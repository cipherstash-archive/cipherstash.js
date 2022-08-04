export type TermType = "string" | "float64" | "uint64" | "date" | "boolean"

export type RecordTypeDefinition = {
  [key: string]: TermType | RecordTypeDefinition
}

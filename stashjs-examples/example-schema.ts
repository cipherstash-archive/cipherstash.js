import { CollectionSchema, downcase, standard } from "@cipherstash/stashjs"

export type Employee = {
  id: string,
  name: string,
  jobTitle: string,
  dateOfBirth: Date,
  email: string,
  grossSalary: bigint
}

export const employeeSchema = CollectionSchema.define<Employee>("employees")(mapping => ({
  email: mapping.Exact("email"),
  dateOfBirth: mapping.Range("dateOfBirth"),
  jobTitle: mapping.Match(["jobTitle"], {
    tokenFilters: [downcase],
    tokenizer: standard
  }),
  allStringFields1: mapping.DynamicMatch({
    tokenFilters: [downcase],
    tokenizer: standard
  }),
  allStringFields2: mapping.ScopedDynamicMatch({
    tokenFilters: [downcase],
    tokenizer: standard
  })
}))

import { Collection, downcase, ngram, standardTokenizer } from "../client-ts/dist"

export type Employee = {
  id: string,
  name: string,
  jobTitle: string,
  dateOfBirth: Date,
  email: string,
  grossSalary: bigint 
}

export const employeeSchema = Collection.define<Employee>("employees")(mapping => ({
  email: mapping.Exact("email"),
  dateOfBirth: mapping.Range("dateOfBirth"),
  jobTitle: mapping.Match(["jobTitle"], {
    tokenFilters: [downcase, ngram({ minSize: 2, maxSize: 3 })],
    tokenizer: standardTokenizer({ maxTokenLength: 20 })
  })
}))
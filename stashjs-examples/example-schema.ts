import { CollectionSchema, downcase, ngram } from "@cipherstash/stashjs"

export type Movie = {
  id?: string,
  title: string,
  year: number,
  runningTime: number
}

export const movieSchema = CollectionSchema.define<Movie>("movies").indexedWith(mapping => ({
  exactTitle: mapping.Exact("title"),
  title: mapping.Match(["title"], {
    tokenFilters: [downcase],
    tokenizer: ngram({ tokenLength: 3 })
    //tokenizer: standard
  }),
  year: mapping.Range("year"),
  runningTime: mapping.Range("runningTime")
}))

import { CollectionSchema, downcase, ngram, standard } from "@cipherstash/stashjs"

export type Movie = {
  id?: string,
  title: string,
  year: number,
  runningTime: number
}

export const movieSchema = CollectionSchema.define<Movie>("movies-dan-1").indexedWith(mapping => ({
  exactTitle: mapping.Exact("title"),
  title: mapping.Match(["title"], {
    tokenFilters: [downcase, ngram({ tokenLength: 3 })],
    tokenizer: standard
  }),
  year: mapping.Range("year"),
  runningTime: mapping.Range("runningTime")
}))

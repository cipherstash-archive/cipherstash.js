export type NgramTokenizerConfig = { tokenLength: number }
export type NgramTokenizer = { kind: "ngram" } & NgramTokenizerConfig

export type StandardTokenizer = { kind: "standard" }

export type DowncaseFilter = { kind: "downcase" }
export type UpcaseFilter = { kind: "upcase" }

export type TokenFilter =
  | NgramTokenizer
  | DowncaseFilter
  | UpcaseFilter

export type Tokenizer =
  | StandardTokenizer
  | NgramTokenizer

export const downcase: DowncaseFilter = { kind: "downcase" }
export const upcase: UpcaseFilter = { kind: "upcase" }

export const ngram: (config: NgramTokenizerConfig) => NgramTokenizer =
  (config) => ({ kind: "ngram", ...config })

export const standard: StandardTokenizer = ({ kind: "standard" })
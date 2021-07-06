export type NgramTokenizerConfig = { tokenLength: number }
export type NgramTokenizer = { processor: "ngram" } & NgramTokenizerConfig

export type StandardTokenizer = { processor: "standard" }

export type DowncaseFilter = { processor: "downcase" }
export type UpcaseFilter = { processor: "upcase" }

export type TokenFilter =
  | NgramTokenizer
  | DowncaseFilter 
  | UpcaseFilter

export type Tokenizer =
  | StandardTokenizer
  | NgramTokenizer

export const downcase: DowncaseFilter = { processor: "downcase" }
export const upcase: UpcaseFilter = { processor: "upcase" }

export const ngram: (config: NgramTokenizerConfig) => NgramTokenizer =
  (config) => ({ processor: "ngram", ...config })

export const standard: StandardTokenizer = ({ processor: "standard" })
export type NgramTokenizerKind = "ngram"
export type StandardTokenizerKind = "standard"

export type TokenizerKind =
  | NgramTokenizer 
  | StandardTokenizer 

export type DowncaseFilterKind = "downcase"
export type UpcaseFilterKind = "upcase"

export type TokenFilterKind =
  | DowncaseFilterKind
  | UpcaseFilterKind
  | TokenizerKind

export type NgramTokenizerConfig = { tokenLength: number }
export type NgramTokenizer = { processor: NgramTokenizerKind } & NgramTokenizerConfig

export type StandardTokenizer = { processor: StandardTokenizerKind }

export type DowncaseFilter = { processor: DowncaseFilterKind }
export type UpcaseFilter = { processor: UpcaseFilterKind }

export type TokenFilter =
  | NgramTokenizer
  | DowncaseFilter 
  | UpcaseFilter

export type Tokenizer =
  | StandardTokenizer
  | NgramTokenizer

export const downcaseFilterDefinition: DowncaseFilter = { processor: "downcase" }
export const upcaseFilterDefinition: UpcaseFilter = { processor: "upcase" }

export const ngramTokenizerDefinition: (config: NgramTokenizerConfig) => NgramTokenizer =
  (config) => ({ processor: "ngram", ...config })

export const standardTokenizerDefinition: StandardTokenizer = ({ processor: "standard" })
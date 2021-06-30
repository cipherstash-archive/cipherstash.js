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

export type NgramConfig = { minSize: number, maxSize: number }
export type NgramTokenizer = { tokenizer: NgramTokenizerKind } & NgramConfig

export type StandardTokenizerConfig = { maxTokenLength: number }
export type StandardTokenizer = { tokenizer: StandardTokenizerKind } & StandardTokenizerConfig

export type DowncaseFilter = { tokenFilter: DowncaseFilterKind }
export type UpcaseFilter = { tokenFilter: UpcaseFilterKind }

export type TokenFilter =
  | NgramTokenizer
  | DowncaseFilter 
  | UpcaseFilter

export type Tokenizer =
  | StandardTokenizer
  | NgramTokenizer

export const downcase: DowncaseFilter = { tokenFilter: "downcase" }
export const upcase: UpcaseFilter = { tokenFilter: "upcase" }

export const ngram: (config: NgramConfig) => NgramTokenizer =
  (config) => ({ tokenizer: "ngram", ...config })

export const standardTokenizer: (config: StandardTokenizerConfig) => StandardTokenizer =
  (config) => ({ tokenizer: "standard", ...config })
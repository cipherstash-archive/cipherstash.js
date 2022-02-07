import  { NgramTokenizerConfig } from './dsl/filters-and-tokenizers-dsl'
import { compose } from './fp-utils'

/**
 * All filters and tokenizers implement the following type.
 */
export type TextProcessor = (input: Array<string>) => Array<string>

export const standardTokenizer: TextProcessor =
  input => input.flatMap(t => t.split(/[ ,;:!]/))

export const ngramsTokenizer =
  (config: NgramTokenizerConfig): TextProcessor =>
    input =>
      input.flatMap(t =>
        range(0, Math.max(t.length - config.tokenLength, 0)).map(
          (_, index) => t.slice(index, index + config.tokenLength)
        ).flat()
      ).filter(token => token.length == config.tokenLength)

export const downcaseFilter: TextProcessor =
  input => input.flatMap(t => t.toLowerCase())

export const upcaseFilter: TextProcessor =
  input => input.flatMap(t => t.toUpperCase())

export const textPipeline = (tokenizers: Array<TextProcessor>): TextProcessor =>
  tokenizers.reduce((acc, tokenizer) => compose(tokenizer, acc), input => input)

const range = (start: number, end: number) => ({
  map: <T>(callback: (item: number, index: number) => T): Array<T> => {
    let output: Array<T> = []
    for (let n = start, index = 0; n <= end; n++, index++) {
      output.push(callback(n, index))
    }
    return output
  }
})

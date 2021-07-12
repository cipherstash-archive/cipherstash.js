import  { NgramTokenizerConfig } from './dsl/filters-and-tokenizers-dsl'

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
      )

export const downcaseFilter: TextProcessor =
  input => input.flatMap(t => t.toLowerCase())

export const upcaseFilter: TextProcessor =
  input => input.flatMap(t => t.toUpperCase())

export const textPipeline = (tokenizers: Array<TextProcessor>): TextProcessor =>
  tokenizers.reduce((acc, tokenizer) => compose(acc, tokenizer), input => input)

const range = (start: number, end: number) => ({
  map: <T>(callback: (item: number, index: number) => T): Array<T> => {
    let output: Array<T> = []
    for (let n = start, index = 0; n <= end; n++, index++) {
      output.push(callback(n, index))
    }
    return output
  }
})

const compose: (fn1: TextProcessor, fn2: TextProcessor) => TextProcessor =
  (fn1, fn2) => input => fn2(fn1(input))
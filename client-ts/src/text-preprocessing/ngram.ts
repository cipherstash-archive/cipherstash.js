
type NgramConfig = { readonly length: number }
type NgramsFn = (input: string, config?: NgramConfig) => Array<string>

const DefaultConfig: NgramConfig = { length: 3 }

export const ngrams: NgramsFn = (input, config) => {
  const length = (config || DefaultConfig).length
  const array = [...input]
  const ngramsArray = []

  for (var i = 0; i < array.length - (length - 1); i++) {
    const subNgramsArray = []

    for (var j = 0; j < length; j++) {
      subNgramsArray.push(array[i + j])
    }

    ngramsArray.push(subNgramsArray.join(''))
  }

  return ngramsArray
}

import { downcaseFilter, ngramsTokenizer, standardTokenizer, textPipeline, upcaseFilter } from './text-processors'

describe("tokenizers & filters", () => {
  describe("ngrams tokenizer", () => {
    it("produces ngrams", () => {
      let tokenizer = ngramsTokenizer({ tokenLength: 3 })
      expect(tokenizer(["lovelace"])).toStrictEqual(['lov', 'ove', 'vel', 'ela', 'lac', 'ace'])
    })
  })

  describe("standard tokenizer", () => {
    it("produces tokens", () => {
      let tokenizer = standardTokenizer
      expect(tokenizer(["Hello from Ada Lovelace"])).toStrictEqual(['Hello', 'from', 'Ada', 'Lovelace'])
    })
  })

  describe("downcase filter", () => {
    it("downcases its input", () => {
      expect(downcaseFilter(["HeLLOWorlD"])).toEqual(["helloworld"])
    })
  })

  describe("upcase filter", () => {
    it("upcases its input", () => {
      expect(upcaseFilter(["HeLLOWorlD"])).toEqual(["HELLOWORLD"])
    })
  })

  describe("chaining filters and tokenizers", () => {
    let pipeline = textPipeline([upcaseFilter, ngramsTokenizer({ tokenLength: 3 })])
    expect(pipeline(["HeLlOwOrLd"])).toEqual(['HEL', 'ELL', 'LLO', 'LOW', 'OWO', 'WOR', 'ORL', 'RLD'])
  })

  it("tokenizes before filters", () => {
    const input = "CipherStash Dev Team"
    let pipeline = textPipeline([standardTokenizer, ngramsTokenizer({ tokenLength: 3 })])
    expect(pipeline([input])).toEqual([
      "Cip",
      "iph",
      "phe",
      "her",
      "erS",
      "rSt",
      "Sta",
      "tas",
      "ash",
      "Dev",
      "Tea",
      "eam"
    ])
  })
})
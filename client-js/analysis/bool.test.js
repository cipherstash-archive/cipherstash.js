const Bool = require('./bool');

describe('perform', () => {
  test('that a literal true is analysed as truthy', () => {
    const bool = new Bool()
    const [result] = bool.perform(true)

    expect(result.readBigUInt64BE()).toEqual(1n)
  })

  test('that the literal false is analysed as falsy', () => {
    const bool = new Bool()
    const [result] = bool.perform(false)

    expect(result.readBigUInt64BE()).toEqual(0n)
  })

  test('that a random string is analysed as falsy', () => {
    const bool = new Bool()
    const [result] = bool.perform("apple")

    expect(result.readBigUInt64BE()).toEqual(0n)
  })
})

describe('performForQuery', () => {
  test('that perform is used for equality', () => {
    const bool = new Bool()
    const [result] = bool.performForQuery('==', true)

    expect(result.readBigUInt64BE()).toEqual(1n)
  })

  test('that non-equality predicates throw an error', () => {
    const bool = new Bool()
    expect(() => {
      bool.performForQuery('>=', true)
    }).toThrow()
  })
})

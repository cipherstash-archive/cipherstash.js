const Mapping = require('./mapping')
const { Bool, Keyword, TypeAhead, UInt, UTCDate, UTCTimestamp } = require('./analysis')

const fieldKeyCity = Buffer.from("c55f5b0221336878fe4b9a63e2fa89d73956c6492a40c53b312254f85ed4e209", "hex")
const fieldKeyAge = Buffer.from("ef135cf590e5bac75451d3f512d9f80eaf65a4198663c5fc57ffb264c6ed0eee", "hex")


const cityAndAgeMapper = new Mapping({
  0: { name: 'city', analyzer: 'keyword', key: fieldKeyCity },
  1: { name: 'age', analyzer: 'uint', key: fieldKeyAge },
})

test('get field with no analyzer set', () => {
  const mapping = new Mapping({})
  expect(() => mapping.getField('city')).toThrow(/Field 'city' not defined/)
})

test('set and get field settings', () => {
  expect(cityAndAgeMapper.getField('city')).toEqual({indexId: expect.anything(), analyzer: new Keyword(), key: fieldKeyCity})
  expect(cityAndAgeMapper.getField('age')).toEqual({indexId: expect.anything(), analyzer: new UInt(), key: fieldKeyAge})
})

describe('Analyzer shortcuts', () => {
  test('keyword analyzer correctly instantiates', () => {
    const analyzer = Mapping.analyzer('keyword')
    expect(analyzer).toBeInstanceOf(Keyword)
  })

  test('typeahead analyzer correctly instantiates', () => {
    const analyzer = Mapping.analyzer('typeahead')
    expect(analyzer).toBeInstanceOf(TypeAhead)
  })

  test('uint analyzer correctly instantiates', () => {
    const analyzer = Mapping.analyzer('uint')
    expect(analyzer).toBeInstanceOf(UInt)
  })

  test('bool analyzer correctly instantiates', () => {
    const analyzer = Mapping.analyzer('bool')
    expect(analyzer).toBeInstanceOf(Bool)
  })

  test('utc-timestamp analyzer correctly instantiates', () => {
    const analyzer = Mapping.analyzer('utc-timestamp')
    expect(analyzer).toBeInstanceOf(UTCTimestamp)
  })

  test('utc-date analyzer correctly instantiates', () => {
    const analyzer = Mapping.analyzer('utc-date')
    expect(analyzer).toBeInstanceOf(UTCDate)
  })
})

describe('Map.all()', () => {
  test('that the defined fields are mapped', () => {
    const result = cityAndAgeMapper.mapAll({city: "Sydney", age: 180})

    // TODO: We really should use ORE compare to check that the terms
    // have been generated correctly (but that requires `node-ore` to have compare
    // implemented)
    expect(result).toHaveLength(2)
  })

  test('that ONLY the defined fields are mapped and other values are ignored', () => {
    const result = cityAndAgeMapper.mapAll({city: "Sydney", age: 180, foo: "Bar", x: 7})

    expect(result).toHaveLength(2)
    // TODO: ORE should be checked (see above)
  })


  // TODO: Test a field with an analyzer that generates more than 1 term (flatmap)
})


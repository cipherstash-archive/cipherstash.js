
const Query = require('./query')

describe('Query builder', () => {
  test('no constraints', () => {
    const q = new Query()
    expect(q.constraints).toEqual([])
  })

  test('single object constraint via constructor', () => {
    const q = new Query({name: "Dan"})
    expect(q.constraints).toEqual([["name", ["==", "Dan"]]])
  })

  test('multiple object constraint via constructor', () => {
    const q = new Query({name: "Dan", email: "dan@coderdan.co"})
    expect(q.constraints).toEqual([["name", ["==", "Dan"]], ["email", ["==", "dan@coderdan.co"]]])
  })

  test('function constraint via constructor', () => {
    const q = new Query((q) => {
      return { age: q.gte(10) }
    })
    expect(q.constraints).toEqual([["age", [">=", 10]]])
  })

  test('single object constraint via where', () => {
    const q = new Query().where({name: "Dan"})
    expect(q.constraints).toEqual([["name", ["==", "Dan"]]])
  })

  test('multiple object constraint via single where', () => {
    const q = new Query().where({name: "Dan", email: "dan@coderdan.co"})
    expect(q.constraints).toEqual([["name", ["==", "Dan"]], ["email", ["==", "dan@coderdan.co"]]])
  })

  test('multiple object constraint via chained where', () => {
    const q = new Query().where({name: "Dan"}).where({email: "dan@coderdan.co"})
    expect(q.constraints).toEqual([["name", ["==", "Dan"]], ["email", ["==", "dan@coderdan.co"]]])
  })

  test('object and functional constraint via chained where', () => {
    const q = new Query().where({name: "Dan"}).where((q) => {
      return { age: q.gte(10) }
    })

    expect(q.constraints).toEqual([["name", ["==", "Dan"]], ["age", [">=", 10]]])
  })

  test('Query.from a Query should pass through', () => {
    const q = new Query({name: "ABC"})
    expect(Query.from(q)).toBe(q)
  })

  test('Query.from a queryable should return a new query', () => {
    const q = Query.from({name: "XYZ"})
    expect(q).toBeInstanceOf(Query)
    expect(q.constraints).toEqual([["name", ["==", "XYZ"]]])
  })
})

describe('Pagination', () => {
  test('default limit', () => {
    const q = new Query()
    expect(q.recordLimit).toEqual(20)
  })

  test('explicit limit', () => {
    const q = new Query().limit(17)
    expect(q.recordLimit).toEqual(17)
  })
})

describe('Query helpers', () => {
  test('EQ', () => {
    const q = new Query((q) => {
      return { age: q.eq(10) }
    })
    expect(q.constraints).toEqual([["age", ["==", 10]]])
  })

  test('GTE', () => {
    const q = new Query((q) => {
      return { age: q.gte(10) }
    })
    expect(q.constraints).toEqual([["age", [">=", 10]]])
  })

  test('GT', () => {
    const q = new Query((q) => {
      return { age: q.gt(20) }
    })
    expect(q.constraints).toEqual([["age", [">", 20]]])
  })

  test('LTE', () => {
    const q = new Query((q) => {
      return { age: q.lte(100) }
    })
    expect(q.constraints).toEqual([["age", ["<=", 100]]])
  })

  test('LT', () => {
    const q = new Query((q) => {
      return { age: q.lt(500) }
    })
    expect(q.constraints).toEqual([["age", ["<", 500]]])
  })

  test('Between', () => {
    const q = new Query((q) => {
      return { age: q.between(10, 20) }
    })
    expect(q.constraints).toEqual([["age", ["><", [10, 20]]]])
  })

  test('MATCH', () => {
    const q = new Query((q) => {
      return { email: q.match("dan@co") }
    })
    expect(q.constraints).toEqual([["email", ["MATCH", "dan@co"]]])
  })
})

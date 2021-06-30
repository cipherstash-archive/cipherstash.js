const UTCDate = require('./utc-date');

test('a Date object is encoded as a 64-bit buffer', () => {
  const utcDate = new UTCDate()
  const [result] = utcDate.perform(new Date("2021-04-29T05:54:39.285Z"))

  expect(result.readBigUInt64BE()).toEqual(1619654400000n)
})

describe('Comparisons', () => {
  test('that two dates in different years compare correctly', () => {
    const utcDate = new UTCDate()
    const [a] = utcDate.perform(new Date(2021, 3, 30))
    const [b] = utcDate.perform(new Date(2021, 3, 29))

    expect(a.readBigUInt64BE()).toBeGreaterThan(b.readBigUInt64BE())
  })

  test('that two dates in different months of the same year compare correctly', () => {
    const utcDate = new UTCDate()
    const [a] = utcDate.perform(new Date(2021, 3, 29))
    const [b] = utcDate.perform(new Date(2021, 4, 29))

    expect(a.readBigUInt64BE()).toBeLessThan(b.readBigUInt64BE())
  })

  test('that two dates in different days of the same month compare correctly', () => {
    const utcDate = new UTCDate()
    const [a] = utcDate.perform(new Date(2021, 4, 25))
    const [b] = utcDate.perform(new Date(2021, 4, 29))

    expect(a.readBigUInt64BE()).toBeLessThan(b.readBigUInt64BE())
  })

  test('that two dates in different hours of the same day are considered equal', () => {
    const utcDate = new UTCDate()
    const [a] = utcDate.perform(new Date(2021, 4, 25, 8))
    const [b] = utcDate.perform(new Date(2021, 4, 25, 6))

    expect(a.readBigUInt64BE()).toEqual(b.readBigUInt64BE())
  })

  test('that two dates in different minutes of the same hour are considered equal', () => {
    const utcDate = new UTCDate()
    const [a] = utcDate.perform(new Date(2021, 4, 25, 8, 17))
    const [b] = utcDate.perform(new Date(2021, 4, 25, 8, 54))

    expect(a.readBigUInt64BE()).toEqual(b.readBigUInt64BE())
  })

  test('that two dates in different seconds of the same minute are considered equal', () => {
    const utcDate = new UTCDate()
    const [a] = utcDate.perform(new Date(2021, 4, 25, 8, 17, 39))
    const [b] = utcDate.perform(new Date(2021, 4, 25, 8, 17, 40))

    expect(a.readBigUInt64BE()).toEqual(b.readBigUInt64BE())
  })

  test('that two dates in different fractions of the same second are considered equal', () => {
    const utcDate = new UTCDate()
    const [a] = utcDate.perform(new Date(2021, 4, 25, 8, 17, 40, 100))
    const [b] = utcDate.perform(new Date(2021, 4, 25, 8, 17, 40, 285))

    expect(a.readBigUInt64BE()).toEqual(b.readBigUInt64BE())
  })
})

describe('Query analysis', () => {
  test('equal-to', () => {
    const utcDate = new UTCDate()
    const [tuple] = utcDate.performForQuery("==", new Date(Date.UTC(2021, 4, 25)))

    expect(tuple).toEqual(Buffer.from("00000179a0d23000", "hex"))
  })

  test('greater-than or equal-to', () => {
    const utcDate = new UTCDate()
    const [tuple] = utcDate.performForQuery(">=", new Date(Date.UTC(2021, 4, 25)))

    expect(tuple).toEqual([
      Buffer.from("00000179a0d23000", "hex"),
      Buffer.from("ffffffffffffffff", "hex")
    ])
  })

  test('greater-than', () => {
    const utcDate = new UTCDate()
    const [tuple] = utcDate.performForQuery(">", new Date(Date.UTC(2021, 4, 25)))

    expect(tuple).toEqual([
      Buffer.from("00000179a0d23001", "hex"),
      Buffer.from("ffffffffffffffff", "hex")
    ])
  })

  test('less-than or equal-to', () => {
    const utcDate = new UTCDate()
    const [tuple] = utcDate.performForQuery("<=", new Date(Date.UTC(2021, 4, 25)))

    expect(tuple).toEqual([
      Buffer.from("0000000000000000", "hex"),
      Buffer.from("00000179a0d23000", "hex")
    ])
  })

  test('less-than', () => {
    const utcDate = new UTCDate()
    const [tuple] = utcDate.performForQuery("<", new Date(Date.UTC(2021, 4, 25)))

    expect(tuple).toEqual([
      Buffer.from("0000000000000000", "hex"),
      Buffer.from("00000179a0d22fff", "hex")
    ])
  })

  test('between', () => {
    const utcDate = new UTCDate()
    const a = new Date(Date.UTC(2020, 6, 1))
    const b = new Date(Date.UTC(2021, 5, 30))
    const [tuple] = utcDate.performForQuery("><", [a, b])

    expect(tuple).toEqual([
      Buffer.from("0000017307ac5000", "hex"),
      Buffer.from("0000017a5a372000", "hex")
    ])
  })
})

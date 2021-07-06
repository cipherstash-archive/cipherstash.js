import { encodeNumber, decodeBigint } from "../crypto/ore"

describe('term encoding', () => {

  it('the UInt64 representation preserves the ordering present in the number (double) representation', () => {
    const doubles: Array<[number, number]> = [
      Number.MIN_VALUE,
      Number.MAX_SAFE_INTEGER,
      -1.5,
      Number.MAX_VALUE,
      Number.MIN_SAFE_INTEGER,
      100,
      0,
      -100.5,
      1,
      -100,
      -1,
    ].map((n, index) => [index, n])

    const sortedDoubles = doubles.sort(doubleComparator)
    const uint64s = doubles.map(([index, n]) => [index, encodeNumber(n)] as [number, bigint])
    const sortedUint64s = uint64s.sort(uint64Comparator)

    // Extract the index value from each array then check the resulting arrays are equal.
    expect(sortedDoubles.map(([index, _]) => index)).toStrictEqual(sortedUint64s.map(([index, _]) => index))
  })

  describe('roundtrip encoding of ', () => {

    describe('integers', () => {
      itRoundtrips(0)
      itRoundtrips(-0)
      itRoundtrips(1)
      itRoundtrips(-1)
      itRoundtrips(100)
      itRoundtrips(-100)
      itRoundtrips(Number.MIN_SAFE_INTEGER)
      itRoundtrips(Number.MIN_SAFE_INTEGER + 1)
      itRoundtrips(Number.MAX_SAFE_INTEGER)
      itRoundtrips(Number.MAX_SAFE_INTEGER - 1)
    })

    describe('doubles', () => {
      itRoundtrips(Number.MIN_VALUE)
      itRoundtrips(Number.MAX_VALUE)
      itRoundtrips(1.5)
      itRoundtrips(-1.5)
      itRoundtrips(100.5)
      itRoundtrips(-100.5)
      itRoundtrips(-0.0)
      itRoundtrips(0.0)
    })
  })
})

// describe('ORE encryption', () => {
//   it('encryptOre produces an ORE term with left and right ciphertexts', () => {
//     const encoded = encodeOrderable(100.0)
//     const oreTerm = encryptOre(encoded.orderable, Buffer.alloc(16), Buffer.alloc(16))

//     expect(oreTerm.left).toBeInstanceOf(Buffer)
//     expect(oreTerm.right).toBeInstanceOf(Buffer)
//   })
// })

function itRoundtrips(value: number): void {
  it(`${value}`, expectRoundtrip(value))
}

function roundtrip(value: number): number {
  return decodeBigint(encodeNumber(value))
}

function expectRoundtrip(value: number): () => void {
  return () => expect(roundtrip(value)).toStrictEqual(value)
}

const doubleComparator = <T extends [number, number]>(a: T, b: T) => a[1] < b[1] ? -1 : a[1] == b[1] ? 0 : 1

const uint64Comparator = <T extends [number, bigint]>(a: T, b: T) => a[1] < b[1] ? -1 : a[1] == b[1] ? 0 : 1
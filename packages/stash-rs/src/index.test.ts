import { ORE } from "./index"
const k1 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
const k2 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

describe("Encrypt", () => {
  test("encrypt big int", () => {
    let ore = ORE.init(k1, k2);
    expect(ore.encrypt(456n).length).toEqual(408);
  })

  test("encrypt number", () => {
    let ore = ORE.init(k1, k2);
    expect(ore.encrypt(456).length).toEqual(408);
  })

  test("invalid k1 size", () => {
    let kbad = Buffer.from([0, 1, 2]);
    expect(() => {
      let ore = ORE.init(kbad, k2);
    }).toThrow("Invalid key length")
  })

  test("invalid k2 size", () => {
    let kbad = Buffer.from([0, 1, 2]);
    expect(() => {
      let ore = ORE.init(k1, kbad);
    }).toThrow("Invalid key length")
  })

  test("invalid plaintext size", () => {
    expect(() => {
      let ore = ORE.init(k1, k2);
      ore.encrypt(456942938989889898333322n);
    }).toThrow(/out of range/)
  })
})

describe("Compare", () => {
  test("compare greater than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(456n),
        ore.encrypt(100n)
      )).toEqual(1);
  })

  test("compare less than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(100n),
        ore.encrypt(788881001n)
      )).toEqual(-1);
  })

  test("compare equal", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(100888n),
        ore.encrypt(100888n)
      )).toEqual(0);
  })

  test("compare equal 0", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(0n),
        ore.encrypt(0n)
      )).toEqual(0);
  })

  test("compare equal 64-bit max", () => {
    let ore = ORE.init(k1, k2);
    let max = 2n ** 64n - 1n;

    expect(
      ORE.compare(
        ore.encrypt(max),
        ore.encrypt(max)
      )).toEqual(0);
  })
})

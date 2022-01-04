import { ORE } from "./index"
const k1 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
const k2 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

describe("Init", () => {
  test("invalid k1 size", () => {
    let kbad = Buffer.from([0, 1, 2]);
    expect(() => {
      ORE.init(kbad, k2);
    }).toThrow("Invalid key length")
  })

  test("invalid k2 size", () => {
    let kbad = Buffer.from([0, 1, 2]);
    expect(() => {
      ORE.init(k1, kbad);
    }).toThrow("Invalid key length")
  })
})

describe("Encrypt", () => {
  test("encrypt big int", () => {
    let ore = ORE.init(k1, k2);
    expect(ore.encrypt(456n).length).toEqual(408);
  })

  test("encrypt number", () => {
    let ore = ORE.init(k1, k2);
    expect(ore.encrypt(456).length).toEqual(408);
  })

  test("encrypt buffer", () => {
    let ore = ORE.init(k1, k2);
    let buf = Buffer.from([1, 1, 1, 1, 2, 2, 2, 2]);
    expect(ore.encrypt(buf).length).toEqual(408);
  })

  test("invalid plaintext size", () => {
    expect(() => {
      let ore = ORE.init(k1, k2);
      ore.encrypt(456942938989889898333322n);
    }).toThrow(/out of range/)
  })
})

describe("Encrypt Left", () => {
  test("encrypt big int", () => {
    let ore = ORE.init(k1, k2);
    expect(ore.encryptLeft(456n).length).toEqual(136);
  })

  test("encrypt number", () => {
    let ore = ORE.init(k1, k2);
    expect(ore.encryptLeft(456).length).toEqual(136);
  })

  test("encrypt buffer", () => {
    let ore = ORE.init(k1, k2);
    let buf = Buffer.from([1, 1, 1, 1, 2, 2, 2, 2]);
    expect(ore.encryptLeft(buf).length).toEqual(136);
  })

  test("invalid plaintext size", () => {
    expect(() => {
      let ore = ORE.init(k1, k2);
      ore.encryptLeft(456942938989889898333322n);
    }).toThrow(/out of range/)
  })
})


describe("Compare (big-int)", () => {
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

describe("Compare (number)", () => {
  test("compare greater than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(456),
        ore.encrypt(100)
      )).toEqual(1);
  })

  test("compare less than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(100),
        ore.encrypt(788881001.75)
      )).toEqual(-1);
  })

  test("compare equal", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(10088),
        ore.encrypt(10088)
      )).toEqual(0);
  })

  test("compare equal 0", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(0),
        ore.encrypt(0)
      )).toEqual(0);
  })

  test("compare equal 64-bit max", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(Number.MAX_SAFE_INTEGER),
        ore.encrypt(Number.MAX_SAFE_INTEGER)
      )).toEqual(0);
  })

  test("compare different fractional component", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(800.3),
        ore.encrypt(800.7)
      )).toEqual(-1);
  })

  test("compare shifted decimal point", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(80000.75),
        ore.encrypt(800.0075)
      )).toEqual(1);
  })

  test("compare negative to positive", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(-800),
        ore.encrypt(700)
      )).toEqual(-1);
  })

  test("compare negative to negative", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(-800),
        ore.encrypt(-900)
      )).toEqual(1);
  })

  test("compare negative to negative with different fractional components", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(-800.3),
        ore.encrypt(-800.766)
      )).toEqual(1);
  })

  test("compare negative to negative with shifted decimal point", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(-80076.6),
        ore.encrypt(-800.766)
      )).toEqual(-1);
  })
})

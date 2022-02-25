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

describe("encode number", () => {
  test("0", () => {
    expect(ORE.encode(0)).toEqual(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0x80]));
  })
})

describe("Encrypt", () => {
  test("encrypt number", () => {
    let ore = ORE.init(k1, k2);
    expect(ore.encrypt(ORE.encodeNumber(456)).length).toEqual(408);
  })
})

describe("Encrypt Left", () => {
  test("encrypt number", () => {
    let ore = ORE.init(k1, k2);
    expect(ore.encryptLeft(ORE.encodeNumber(456)).length).toEqual(136);
  })
})


describe("Compare (big-int)", () => {
  test("compare greater than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(456)),
        ore.encrypt(ORE.encodeNumber(100))
      )).toEqual(1);
  })

  test("compare less than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(100)),
        ore.encrypt(ORE.encodeNumber(788881001))
      )).toEqual(-1);
  })

  test("compare equal", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(100888)),
        ore.encrypt(ORE.encodeNumber(100888))
      )).toEqual(0);
  })

  test("compare equal 0", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(0)),
        ore.encrypt(ORE.encodeNumber(0))
      )).toEqual(0);
  })
})

describe("Compare (number)", () => {
  test("compare greater than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(456)),
        ore.encrypt(ORE.encodeNumber(100))
      )).toEqual(1);
  })

  test("compare less than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(100)),
        ore.encrypt(ORE.encodeNumber(788881001.75))
      )).toEqual(-1);
  })

  test("compare equal", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(10088)),
        ore.encrypt(ORE.encodeNumber(10088))
      )).toEqual(0);
  })

  test("compare equal 0", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(0)),
        ore.encrypt(ORE.encodeNumber(0))
      )).toEqual(0);
  })

  test("compare equal 64-bit max", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(Number.MAX_SAFE_INTEGER)),
        ore.encrypt(ORE.encodeNumber(Number.MAX_SAFE_INTEGER))
      )).toEqual(0);
  })

  test("compare different fractional component", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(800.3)),
        ore.encrypt(ORE.encodeNumber(800.7))
      )).toEqual(-1);
  })

  test("compare shifted decimal point", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(80000.75)),
        ore.encrypt(ORE.encodeNumber(800.0075))
      )).toEqual(1);
  })

  test("compare negative to positive", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(-800)),
        ore.encrypt(ORE.encodeNumber(700))
      )).toEqual(-1);
  })

  test("compare negative to negative", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(-800)),
        ore.encrypt(ORE.encodeNumber(-900))
      )).toEqual(1);
  })

  test("compare negative to negative with different fractional components", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(-800.3)),
        ore.encrypt(ORE.encodeNumber(-800.766))
      )).toEqual(1);
  })

  test("compare negative to negative with shifted decimal point", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encodeNumber(-80076.6)),
        ore.encrypt(ORE.encodeNumber(-800.766))
      )).toEqual(-1);
  })
})

describe("encodeString", () => {
  test("different strings with same NFC form generate the same encoding", () => {
    // See: https://unicode.org/reports/tr15/#Singletons_Figure
    let s1 = '\u1E0A\u0323'
    let s2 = '\u1E0C\u0307'
    expect(ORE.encodeString(s1)).toEqual(ORE.encodeString(s2))
  })
})

describe("encodeRangeBetween", () => {
  test('correct min and max generated in range', () => {
    expect(ORE.encodeRangeBetween(1, 100)).toEqual({ min: ORE.encode(1), max: ORE.encode(100)})
  })
})

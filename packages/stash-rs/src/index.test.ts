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
  test("encrypt number", () => {
    let ore = ORE.init(k1, k2);
    expect(ore.encrypt(ORE.encode(456)).length).toEqual(408);
  })
})

describe("Encrypt Left", () => {
  test("encrypt number", () => {
    let ore = ORE.init(k1, k2);
    expect(ore.encryptLeft(ORE.encode(456)).length).toEqual(136);
  })
})


describe("Compare (big-int)", () => {
  test("compare greater than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(456)),
        ore.encrypt(ORE.encode(100))
      )).toEqual(1);
  })

  test("compare less than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(100)),
        ore.encrypt(ORE.encode(788881001))
      )).toEqual(-1);
  })

  test("compare equal", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(100888)),
        ore.encrypt(ORE.encode(100888))
      )).toEqual(0);
  })

  test("compare equal 0", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(0)),
        ore.encrypt(ORE.encode(0))
      )).toEqual(0);
  })
})

describe("Compare (number)", () => {
  test("compare greater than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(456)),
        ore.encrypt(ORE.encode(100))
      )).toEqual(1);
  })

  test("compare less than", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(100)),
        ore.encrypt(ORE.encode(788881001.75))
      )).toEqual(-1);
  })

  test("compare equal", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(10088)),
        ore.encrypt(ORE.encode(10088))
      )).toEqual(0);
  })

  test("compare equal 0", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(0)),
        ore.encrypt(ORE.encode(0))
      )).toEqual(0);
  })

  test("compare equal 64-bit max", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(Number.MAX_SAFE_INTEGER)),
        ore.encrypt(ORE.encode(Number.MAX_SAFE_INTEGER))
      )).toEqual(0);
  })

  test("compare different fractional component", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(800.3)),
        ore.encrypt(ORE.encode(800.7))
      )).toEqual(-1);
  })

  test("compare shifted decimal point", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(80000.75)),
        ore.encrypt(ORE.encode(800.0075))
      )).toEqual(1);
  })

  test("compare negative to positive", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(-800)),
        ore.encrypt(ORE.encode(700))
      )).toEqual(-1);
  })

  test("compare negative to negative", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(-800)),
        ore.encrypt(ORE.encode(-900))
      )).toEqual(1);
  })

  test("compare negative to negative with different fractional components", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(-800.3)),
        ore.encrypt(ORE.encode(-800.766))
      )).toEqual(1);
  })

  test("compare negative to negative with shifted decimal point", () => {
    let ore = ORE.init(k1, k2);

    expect(
      ORE.compare(
        ore.encrypt(ORE.encode(-80076.6)),
        ore.encrypt(ORE.encode(-800.766))
      )).toEqual(-1);
  })
})

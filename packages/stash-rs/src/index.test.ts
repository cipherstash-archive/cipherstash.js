import { ORE } from "./index"

describe("ORE", () => {
  test("encrypt", () => {
    let k1 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    let k2 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

    let ore = ORE.init(k1, k2);
    let plaintext = Buffer.allocUnsafe(8);
    plaintext.writeBigInt64BE(456n);
    ore.encrypt(plaintext);
  })
})


const Base = require('./base');
// TODO: Move these to methods on the base
const NUM_BITS = 64
const MAX_VALUE = ((1n << BigInt(NUM_BITS)) - 1n)

class UInt extends Base {
  perform(term) {
    return [ this._toUintBuffer(term) ]
  }

  performForQuery(predicate, value) {
    switch (predicate) {
      case "==":
        return [this._toUintBuffer(value)];

      case ">=":
        return [[this._toUintBuffer(value), this._toUintBuffer(MAX_VALUE)]];

      case "<=":
        return [[this._toUintBuffer(0n), this._toUintBuffer(value)]];

      case ">":
        return [[this._toUintBuffer(BigInt(value) + 1n), this._toUintBuffer(MAX_VALUE)]];

      case "<":
        return [[this._toUintBuffer(0n), this._toUintBuffer(BigInt(value) - 1n)]];

      case "><":
        const [min, max] = value;
        return [[this._toUintBuffer(min), this._toUintBuffer(max)]];

      default:
        this.throwUnknownPredicate(predicate);
    }
  }

  /* Writes a 64-bit unsigned integer to a Buffer
   * in BigEndian order */
  _toUintBuffer(term) {
    // TODO: Force conversion to Bigint - and test that
    const term64 = BigInt(term)
    const buff = Buffer.alloc(8)

    buff.writeBigUInt64BE(term64)

    return buff
  }

}

module.exports = UInt;

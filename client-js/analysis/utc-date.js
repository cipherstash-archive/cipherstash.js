const Base = require('./base');
const UInt = require('./uint');

class UTCDate extends Base {
  constructor() {
    super()
    this.uint = new UInt()
  }

  perform(term) {
    const date = this.parseDate(term)
    const encoded = this.encodeDate(date)
    return this.uint.perform(encoded)
  }

  // FIXME: This approach won't be able to be encoded
  // into a 32-bit integer. Don't convert to a UTC date
  // (just multiply out the terms)
  encodeDate(date) {
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  }

  parseDate(term) {
    if (term instanceof Date) {
      return term
    } else {
      throw `Term is not a Date instance, got ${JSON.stringify(term)}`
    }
  }

  // Term could be a date object or a 2-element array (between)
  performForQuery(predicate, term) {
    if (term instanceof Array) {
      return this.uint.performForQuery(predicate, term.map(this.encodeDate))
    } else {
      return this.uint.performForQuery(predicate, this.encodeDate(term))
    }
  }
}

module.exports = UTCDate 

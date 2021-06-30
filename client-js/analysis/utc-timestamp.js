
const Base = require('./base');
const UInt = require('./uint');

/* Doesn't support Timezone currently */
class UTCTimestamp extends Base {
  constructor() {
    super()
    // FIXME: This is a bit shit - analyzers should use static methods?
    this.uint = new UInt()
  }

  /* Encodes the term as an integer and then
   * uses the UInt analyser */
  perform(term) {
    const date = this.parseDate(term)
    const encoded = this.encodeDate(date)

    return this.uint.perform(encoded)
  }

  encodeDate(date) {
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getMilliseconds()
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

module.exports = UTCTimestamp

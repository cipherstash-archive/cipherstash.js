
const Base = require('./base');
const UInt = require('./uint');

class Bool extends Base {
  constructor() {
    super()
    // FIXME: This is a bit shit - analyzers should use static methods?
    this.uint = new UInt()
  }

  /* Tests for a literal true and then uses the UInt analyser.*/
  perform(term) {
    if (term === true) {
      return this.uint.perform(1n)
    } else {
      return this.uint.perform(0n)
    }
  }

  performForQuery(predicate, term) {
    if (predicate == "==") {
      return this.perform(term)
    } else {
      this.throwUnknownPredicate(predicate);
    }
  }

}

module.exports = Bool

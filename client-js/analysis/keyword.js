
const Base = require('./base');

class Keyword extends Base {
  perform(term) {
    // TODO: This should use the fieldKey (not a universally hard coded key)
    return [ this.sipHashTerm(term) ]
  }

  // TODO: Test this
  performForQuery(predicate, term) {
    if (predicate == "==") {
      return this.perform(term)
    } else {
      this.throwUnknownPredicate(predicate);
    }
  }
}

module.exports = Keyword;

const SipHash = require('siphash');
const SIPKEY = [ 0xdeadbeef, 0xcafebabe, 0x8badf00d, 0x1badb002 ];
const Base = require('./base');

class TypeAhead extends Base {
  perform(term) {
    const terms = term.toLowerCase().split(/[,;:!]/).flatMap((token) => {
      return this.ngrams(token, 3);
    }).map((gram) => {
      return this.sipHashTerm(gram);
    });

    return terms;
  }

  performForQuery(predicate, term) {
    if (predicate == "MATCH") {
      return this.perform(term);
    } else {
      this.throwUnknownPredicate(predicate);
    }
  }

  ngrams(str, length = 3) {
    const array = [...str];
    const ngramsArray = [];

    for (var i = 0; i < array.length - (length - 1); i++) {
      const subNgramsArray = [];

      for (var j = 0; j < length; j++) {
        subNgramsArray.push(array[i + j])
      }

      ngramsArray.push(subNgramsArray.join(''));
    }

    return ngramsArray;
  }
}

module.exports = TypeAhead;

const SipHash = require('siphash');
const SIPKEY = [ 0xdeadbeef, 0xcafebabe, 0x8badf00d, 0x1badb002 ];

module.exports = class Base {
  /* Returns an 8-byte Buffer of the SIPHASHED term */
  sipHashTerm(term) {
    const {h: h, l: l} = SipHash.hash(SIPKEY, term)
    const buff = Buffer.alloc(8)
    buff.writeUInt32BE(h)
    buff.writeUInt32BE(l, 4)

    return buff
  }

  performForQuery(_predicate, _constraint) {
    throw("analyser (" + this.constructor.name + ") does not implement performForQuery");
  }

  throwUnknownPredicate(predicate) {
    throw("unknown predicate '" + predicate + "' for " + this.constructor.name);
  }
}


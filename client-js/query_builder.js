
// TODO: Deprecated - this can be removed
const QueryBuilder = (query, mapping, cipherSuite) => {
  const {constraints} = query

  /* There is a simple query protocol used for the Stash Data Service
   * Terms starting with a `0` byte mean a single equality match to a single term
   * while terms starting a `1` byte mean a range query containing a min and max term.
   */
  const cts = constraints.flatMap(([field, condition]) => {
    return mapping.query(field, condition);
  }).map(async (term) => {
    // TODO: Only left terms should be required for the query!
    if (term instanceof Array && term.length == 2) {
      const [min, max] = term;
      const {left: minL, right: minR} = await cipherSuite.encryptTerm(min);
      const {left: maxL, right: maxR} = await cipherSuite.encryptTerm(max);

      return Buffer.concat([
        Buffer.from([1]),
        minL,
        minR,
        maxL,
        maxR
      ]);
    } else {
      const {left: left, right: right} = await cipherSuite.encryptTerm(term);
      return Buffer.concat([Buffer.from([0]), left, right]);
    }
  })

  return Promise.all(cts)
}

module.exports = QueryBuilder

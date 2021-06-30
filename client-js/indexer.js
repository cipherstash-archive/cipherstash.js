
// TODO: Move the ORE code to here so it is self contained
const Indexer = async (doc, mapping) => {
  const entries = mapping.mapAll(doc).filter(([term]) => !!term).map(async ([term]) => {
    const { indexId, ore: { left, right }} = term
    // TODO: await all terms sequentially for now - possibly could use Promise.all?
    // That could be a lot of parallelism - might be better to chunk it up or stream somehow
    return { indexId, ore: Buffer.concat([left, right]) }
  });
  return Promise.all(entries)
}

module.exports = Indexer

import * as SipHash from 'siphash'

// Note that this key is not a cryptographic secret. All siphash hashes will be
// ORE encrypted.  The plain hashes are never saved.
export const DefaultKey: SipHash.Key = [ 0xdeadbeef, 0xcafebabe, 0x8badf00d, 0x1badb002 ];

export type SipHashBuffer = { sipHash: Buffer }

export type MakeHashFn = (key: SipHash.Key) => (term: string) => SipHashBuffer

export const makeHashFn: MakeHashFn = (key) => (term) => {
  const {h: h, l: l} = SipHash.hash(key, term)
  const buff = Buffer.alloc(8)
  buff.writeUInt32BE(h)
  buff.writeUInt32BE(l, 4)
  return { sipHash: buff }
}

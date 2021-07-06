import { oreEncryptTerm } from '../../../build/Release/napi_ore'
export { encodeNumber, decodeBigint } from '../../../build/Release/napi_ore'

export function oreEncryptTermToBuffer(term: bigint, prf: Buffer, prp: Buffer): Buffer {
  const { leftCipherText, rightCipherText } = oreEncryptTerm(term, prf, prp)
  return Buffer.concat([leftCipherText, rightCipherText])
}
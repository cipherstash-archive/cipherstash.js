export type OreEncryptedTerm = {
  leftCipherText: Buffer,
  rightCipherText: Buffer
}

/**
 * Encrypts a term using the ORE (Order-Revealing Encryption) scheme.
 * 
 * The term is a bigint but must be in the allowed range of values of a 64bit
 * unsigned integer. Values outside of this range will trigger an exception.
 * 
 * @param term an unsigned 64 bit integer represented as a bigint
 * @param prf the PRF key
 * @param prp the PRP key
 * 
 * @throws an error if the term is outside the allowed numerical range of a uint64_t
 * @returns an ORE encrypted term
 */
export function oreEncryptTerm(term: bigint, prf: Buffer, prp: Buffer): OreEncryptedTerm

/**
 * Encodes a JS `number` (a 64 bit IEEE 754 floating point number) into a JS
 * `bigint` (in the range of a uint64_t) such that the bigints retain the same
 * sort order as the number they were derived from.
 * 
 * Imagine a having a sorted array of numbers and mapping that to an array of
 * bigint using this function.   Sorting the array of generated bigints will
 * have no effect because original array of numbers was already sorted and sort
 * order is preserved.
 * 
 * @param value the number to convert
 * @returns a bigint that preserves the sort order of the original number
 */
export function encodeNumber(value: number): bigint

/**
 * This is the inverse of `encodeNumber`. It is used for testing purposes only.
 * 
 * @throws an error if the bigint is out of range (i.e. not within the allowed
 *         range of a uint64_t)  
 * @param value the bigint to convert back to a number
 * @returns the original number that the bigint was derived from
 */
export function decodeBigint(value: bigint): number
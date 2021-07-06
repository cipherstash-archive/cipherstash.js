declare module 'siphash' {
  export type Key = [number, number, number, number]
  export type Hash = {
    h: number,
    l: number
  }
  export function hash(key: Key, term: string): Hash
}
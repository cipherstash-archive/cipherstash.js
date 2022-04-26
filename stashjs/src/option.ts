
export type Option<V> =
  | Readonly<{ tag: 'Option.Something', value: V }>
  | Readonly<{ tag: 'Option.Nothing' }>

export function isSomething<V>(option: any): option is { tag: 'Option.Something', value: V } {
  return option?.tag === 'Option.Something'
}

export function isNothing(option: any): option is { tag: 'Option.Nothing' } {
  return option?.tag === 'Option.Nothing'
}

export function Something<V>(value: V): Option<V> {
  return { tag: 'Option.Something', value }
}

export const Nothing: Readonly<{ tag: 'Option.Nothing' }> = { tag: 'Option.Nothing' }

export function unwrapArray<T>(arr: Array<Option<T>>): Array<T> {
  return arr.filter(isSomething).map(option => (option as { tag: 'Option.Something', value: T }).value)
}
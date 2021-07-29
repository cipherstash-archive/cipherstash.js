
/**
 * Utility for conatenating two field names together in order to support typing
 * of accessors for nested fields.
 */
export type FieldDotField<
  A extends string,
  B extends string
> = `${A}.${B}`

/**
 * Type guard to check whether a field is of type FieldDotField.
 */
export function isFieldDotField<
  A extends string,
  B extends string
>(
  field: string
): field is FieldDotField<A, B> {
  return field.indexOf(".") > -1
}

/**
 * Extracts the available fields from R. Nested fields will be returned in dot notation.
 */
export type Field<R> = {
  [K in keyof R]-?:
    K extends string ?
      R[K] extends {[key: string]: unknown } ?
        FieldDotField<K, Field<R[K]>> : K
    : never
}[keyof R]

/**
 * Given R and a Field of R, return the type of that field.
 */
export type FieldType<R, S extends Field<R>> =
  S extends `${infer A}.${infer B}` ?
    A extends keyof R ?
      B extends Field<R[A]> ?
        FieldType<R[A], B>
      : never
    : never
  : S extends keyof R ?
    R[S]
  : never

/**
 * Find all Fields on R of a particular type.
 */
type FindFieldsOfType<
  R,
  S extends Field<R>,
  T
> = { [F in S]: T extends FieldType<R, F> ? F : never }[S]

/**
 * Represents all Fields on R of type T.
 */
export type FieldOfType<R, T> = FindFieldsOfType<R, Field<R>, T>

/**
 * Get the type name of a type.
 *
 * JS sucks at this, e.g. typeof new Date() returns "[object Object]"
 */
export type TypeName<T> =
  T extends string ? "string" :
  T extends number ? "number" :
  T extends boolean ? "boolean" :
  T extends bigint ? "bigint" :
  T extends Date ? "Date" :
  never

/**
 * In cases where we cannot prove to TypeScript that an `if` or `switch` is
 * exhaustive in its condition checking, this function allows us to tell TS that
 * an `else` or `default` block is unreachable. In the event that what we tell
 * the compiler was incorrect, it will also throw an error at run time.
 */
export function unreachable(message: string): never {
  throw new Error(message)
}

/**
 * Generates a new type from T where any keys defined in K become optional in
 * the returned type.
 */
export type Optional<T, K extends keyof T> =
  Pick<Partial<T>, K> & Omit<T, K>
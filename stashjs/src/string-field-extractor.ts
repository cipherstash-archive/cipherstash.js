import { isPlainObject } from 'is-plain-object'

export function extractStringFields(obj: object): Array<string> {
  return Object.values(obj).flatMap(v => {
    if (typeof v == "string") {
      return [v]
    } else if (isPlainObject(v)) {
      return extractStringFields(v)
    } else {
      return []
    }
  })
}

export function extractStringFieldsWithPath(obj: object): Array<[string, string]> {
  return extractStringFieldsWithPathInternal(obj).map(({field, value}) => [field, value])
}

type FieldValue = {
  field: string,
  value: string
}

function extractStringFieldsWithPathInternal(obj: object, path: Array<string> = []): Array<FieldValue> {
  return Object.entries(obj).flatMap<FieldValue>(([f, v]) => {
    if (typeof v == "string") {
      return {
        field: path.concat(f).join('.'),
        value: v
      }
    } else if (isPlainObject(v)) {
      return extractStringFieldsWithPathInternal(v, path.concat(f))
    } else {
      return []
    }
  })
}
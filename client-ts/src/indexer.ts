import { Collection } from "./collection";
import { StashRecord, Mappings, MappingsMeta, MappableFieldType, isExactMapping, isRangeMapping, RangeType, isMatchMapping } from "./dsl/mappings-dsl";
import { encodeEquatable, encodeOrderable } from "./encoders/term-encoder";
import { FieldOfType, FieldType, isFieldDotField, unreachable } from "./type-utils";

export type AnalyzedRecord<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
> = {
  recordId: R['id'],
  indexEntries: {
    [F in keyof MM]: Array<bigint>
  }
}

export async function analyzeRecord<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
>(
  collection: Collection<R, M>,
  record: R
): Promise<AnalyzedRecord<R, M, MM>> {
  const indices = Object.entries(collection.mappings).map(([indexName, mapping]) => {
    const meta = collection.mappingsMeta[indexName]!

    if (isExactMapping<R, FieldOfType<R, MappableFieldType>>(mapping)) {
      const term = extractField(record)(mapping.field)
      return { indexId: meta.$indexId, encodedTerms: indexExact(term) }
    }

    if (isRangeMapping<R, FieldOfType<R, RangeType>>(mapping)) {
      const term = extractField(record)(mapping.field)
      return { indexId: meta.$indexId, encodedTerms: indexRange(term) }
    }

    if (isMatchMapping<R, FieldOfType<R, string>>(mapping)) {
      const terms = mapping.fields.map(extractField(record))
      return { indexId: meta.$indexId, encodedTerms: indexMatch(terms) }
    }

    return unreachable("Internal error: unreachable code reached")
  })

  return Promise.resolve({
    recordId: record.id,
    indexEntries: indices.reduce((acc, { indexId, encodedTerms }) => {
      return Object.assign(acc, { [indexId]: encodedTerms })
    }, {})
  } as AnalyzedRecord<R, M, MM>)
}

const extractField = <R extends StashRecord, F extends FieldOfType<R, MappableFieldType>>(record: R) => (field: F) => {
  return extractFieldRecursive(record, field)
}

const extractFieldRecursive: <
  R extends { [key: string]: any },
  F extends FieldOfType<R, MappableFieldType>
>(record: R, field: F) => FieldType<R, F> = (record, field) => {
  if (isFieldDotField(field)) {
    const first = field.substring(0, field.indexOf("."))
    const rest = field.substring(field.indexOf("."))
    return extractFieldRecursive(record[first], rest)
  } else {
    return record[field]
  }
}

const indexExact: <T extends MappableFieldType>(term: T) => Array<bigint>
  = (term) => [encodeEquatable(term).equatable]

const indexRange: <T extends number | bigint | boolean | Date>(term: T) => Array<bigint>
  = (term) => [encodeOrderable(term).orderable]

const indexMatch: (terms: Array<string>) => Array<bigint>
  = (terms) => terms.map(t => encodeEquatable(t).equatable)
import { Collection } from "./collection";
import { TokenFilter, Tokenizer } from "./dsl/filters-and-tokenizers-dsl";
import { StashRecord, Mappings, MappingsMeta, MappableFieldType, isExactMapping, isRangeMapping, RangeMappingFieldType, isMatchMapping, ExactMappingFieldType, MatchMappingFieldType, MatchOptions } from "./dsl/mappings-dsl";
import { encodeEquatable, encodeOrderable } from "./encoders/term-encoder";
import { downcaseFilter, ngramsTokenizer, standardTokenizer, textPipeline, TextProcessor, upcaseFilter } from "./text-processors";
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

/**
 * Generates the index entries for a record in order to make it searchable.
 * 
 * TODO: this function performs a lot of work per-record that should be only
 * performed once per collection. Consider generating an analyzeRecord function
 * once.
 * 
 * @param collection the collection that the record belongs to
 * @param record the record to analyze
 * @returns an AnalyzedRecord (wrapped in a Promise)
 */
export async function analyzeRecord<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
>(
  collection: Collection<R, M, MM>,
  record: R
): Promise<AnalyzedRecord<R, M, MM>> {
  const indices = Object.entries(collection.schema.mappings).map(([indexName, mapping]) => {
    const meta = collection.schema.meta[indexName]!

    if (isExactMapping<R, FieldOfType<R, ExactMappingFieldType>>(mapping)) {
      const term = extractField(record)(mapping.field)
      return { indexId: meta.$indexId, encodedTerms: indexExact(term) }
    }

    if (isRangeMapping<R, FieldOfType<R, RangeMappingFieldType>>(mapping)) {
      const term = extractField(record)(mapping.field)
      return { indexId: meta.$indexId, encodedTerms: indexRange(term) }
    }

    if (isMatchMapping<R, FieldOfType<R, MatchMappingFieldType>>(mapping)) {
      const terms = mapping.fields.map(extractField(record))
      const pipeline = buildTextProcessingPipeline(mapping.options)
      return { indexId: meta.$indexId, encodedTerms: indexMatch(pipeline(terms)) }
    }

    return unreachable(`Internal error: unreachable code reached. Unknown mapping: ${JSON.stringify(mapping)}`)
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

const indexExact: <T extends ExactMappingFieldType>(term: T) => Array<bigint>
  = term =>
    [ encodeEquatable(term).equatable ]

const indexRange: <T extends RangeMappingFieldType>(term: T) => Array<bigint>
  = term =>
    [ encodeOrderable(term).orderable ]

const indexMatch: (terms: Array<MatchMappingFieldType>) => Array<bigint> = terms => { 
  return terms.map(t => encodeEquatable(t).equatable)
}

const buildTextProcessingPipeline: (options: MatchOptions) => TextProcessor = options => {
  let pipeline: Array<TextProcessor> = options.tokenFilters.map(loadTextProcessor).concat([loadTextProcessor(options.tokenizer)])
  return textPipeline(pipeline)
}

const loadTextProcessor = (filter: TokenFilter | Tokenizer): TextProcessor => {
  switch (filter.processor) {
    case "standard": return standardTokenizer
    case "ngram": return ngramsTokenizer({ tokenLength: filter.tokenLength })
    case "downcase": return downcaseFilter
    case "upcase": return upcaseFilter
  }
}
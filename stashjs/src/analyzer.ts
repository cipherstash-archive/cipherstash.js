import { V1 } from "../../stashjs-grpc";
import { CollectionSchema } from "./collection-schema";
import { oreEncryptTermToBuffer } from "./crypto/ore";
import { TokenFilter, Tokenizer } from "./dsl/filters-and-tokenizers-dsl";
import { DynamicMatchMapping, ExactMappingFieldType, isDynamicMatchMapping, isExactMapping, isMatchMapping, isRangeMapping, isFieldDynamicMatchMapping, MappableFieldType, Mappings, MappingsMeta, MatchMapping, MatchMappingFieldType, MatchOptions, RangeMappingFieldType, FieldDynamicMatchMapping, StashRecord } from "./dsl/mappings-dsl"
import { ConjunctiveCondition, DynamicMatchCondition, ExactCondition, isConjunctiveCondition, isDynamicMatchCondition, isExactCondition, isMatchCondition, isRangeCondition, isFieldDynamicMatchCondition, MatchCondition, Query, RangeCondition, RangeOperator, FieldDynamicMatchCondition } from "./dsl/query-dsl";
import { encodeEquatable, encodeOrderable, UINT64_MAX, UINT64_MIN } from "./encoders/term-encoder";
import { extractStringFields, extractStringFieldsWithPath } from "./string-field-extractor";
import { TextProcessor, textPipeline, standardTokenizer, ngramsTokenizer, downcaseFilter, upcaseFilter } from "./text-processors";
import { FieldOfType, FieldType, unreachable } from "./type-utils";
import { biggest, smallest, idToBuffer } from "./utils";

/**
 * Builds and returns a function that will analyze a record using the mapping
 * configuration for a collection.
 *
 * The basic premise is that some of the work can be performed upfront just once
 * (e.g. assembling the text processing pipelines) instead of for every record
 * that is processed.
 *
 * @param schema R the CollectionSchema from which to build an analyzer
 * @returns the analyzer function that is built
 */
export function buildRecordAnalyzer<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
>(
  schema: CollectionSchema<R, M, MM>
): RecordAnalyzer<R, M, MM> {
  const mappingAnalzers = Object.entries(schema.mappings).map(([indexName, mapping]) => {
    const meta = schema.meta[indexName]!

    // FIXME: handle missing data in records

    if (isExactMapping<R, FieldOfType<R, ExactMappingFieldType>>(mapping)) {
      const fieldExtractor = buildFieldExtractor(mapping.field)
      return (record: R) => ({
        indexId: meta.$indexId,
        encodedTerms: indexExact(fieldExtractor(record))
      })
    }

    if (isRangeMapping<R, FieldOfType<R, RangeMappingFieldType>>(mapping)) {
      const fieldExtractor = buildFieldExtractor(mapping.field)
      return (record: R) => ({
        indexId: meta.$indexId,
        encodedTerms: indexRange(fieldExtractor(record))
      })
    }

    if (isMatchMapping<R, FieldOfType<R, MatchMappingFieldType>>(mapping)) {
      const fieldExtractors = mapping.fields.map(f => buildFieldExtractor(f))
      const pipeline = buildTextProcessingPipeline(mapping.options)
      return (record: R) => ({
        indexId: meta.$indexId,
        encodedTerms: indexMatch(pipeline(fieldExtractors.map(fe => fe(record)).filter(t => !!t)))
      })
    }

    if (isDynamicMatchMapping(mapping)) {
      const pipeline = buildTextProcessingPipeline(mapping.options)
      return (record: R) => ({
        indexId: meta.$indexId,
        encodedTerms: indexMatch(pipeline(extractStringFields(record)))
      })
    }

    if (isFieldDynamicMatchMapping(mapping)) {
      const pipeline = buildTextProcessingPipeline(mapping.options)
      return (record: R) => ({
        indexId: meta.$indexId,
        encodedTerms: indexMatch(extractStringFieldsWithPath(record).flatMap(([f, v]) => {
          return pipeline([v]).map(t => `${f}:${t}`)
        }))
      })
    }

    return unreachable(`Internal error: unreachable code reached. Unknown mapping: ${JSON.stringify(mapping)}`)
  })

  return (record: R) => ({
    recordId: record.id,
    indexEntries: mappingAnalzers.map(
      analyzer => analyzer(record)).reduce((acc, { indexId, encodedTerms }) => {
        if (encodedTerms.length > 0) {
          return Object.assign(acc, { [indexId]: encodedTerms })
        } else {
          return acc
        }
      }, {})
  }) as AnalyzedRecord<R, M, MM>
}

export function buildQueryAnalyzer<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
>(
  schema: CollectionSchema<R, M, MM>
): QueryAnalyzer<R, M> {
  return (
    query: Query<R, M>
  ) => {
    return { constraints: flattenCondition(query, schema.mappings, schema.meta) }
  }
}

function flattenCondition<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
  >(
    condition:
      | ConjunctiveCondition<R, M>
      | ExactCondition<R, M, Extract<keyof M, string>>
      | RangeCondition<R, M, Extract<keyof M, string>>
      | MatchCondition<R, M, Extract<keyof M, string>>
      | DynamicMatchCondition<R, M, Extract<keyof M, string>>
      | FieldDynamicMatchCondition<R, M, Extract<keyof M, string>>,
    mappings: M,
    meta: MM
  ): Array<V1.Query.Constraint> {

  if (isConjunctiveCondition<R, M>(condition)) {
    return condition.conditions.flatMap(c => flattenCondition<R, M, MM>(c, mappings, meta))
  } else if (isExactCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    return [{
      indexId: idToBuffer(indexMeta.$indexId),
      exact: encodeExact(condition, indexMeta.$prfKey, indexMeta.$prpKey),
      condition: "exact"
    }]
  } else if (isRangeCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    return [{
      indexId: idToBuffer(indexMeta.$indexId),
      range: encodeRange(condition, indexMeta.$prfKey, indexMeta.$prpKey),
      condition: "range"
    }]
  } else if (isMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    const mapping = mappings[condition.indexName]! as MatchMapping<R, FieldOfType<R, MatchMappingFieldType>>
    const pipeline = buildTextProcessingPipeline(mapping.options)
    return pipeline([condition.value]).map(term => ({
      indexId: idToBuffer(indexMeta.$indexId),
      exact: encodeMatch(term, indexMeta.$prfKey, indexMeta.$prpKey),
      condition: "exact"
    }))
  } else if (isDynamicMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    const mapping = mappings[condition.indexName]! as DynamicMatchMapping
    const pipeline = buildTextProcessingPipeline(mapping.options)
    return pipeline([condition.value]).map(term => ({
      indexId: Buffer.from(indexMeta.$indexId, 'hex'),
      exact: encodeMatch(term, indexMeta.$prfKey, indexMeta.$prpKey),
      condition: "exact"
    }))
  } else if (isFieldDynamicMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    const mapping = mappings[condition.indexName]! as FieldDynamicMatchMapping
    const pipeline = buildTextProcessingPipeline(mapping.options)
    return pipeline([condition.value]).map(term => ({
      indexId: Buffer.from(indexMeta.$indexId, 'hex'),
      exact: encodeMatch(`${condition.fieldName}:${term}`, indexMeta.$prfKey, indexMeta.$prpKey),
      condition: "exact"
    }))
  } else {
    return unreachable(`Internal error - unknown condition kind: ${JSON.stringify(condition)}`)
  }
}

const indexExact: <T extends ExactMappingFieldType>(term: T) => Array<bigint>
  = term =>
    term ? [ encodeEquatable(term).equatable ] : []

const indexRange: <T extends RangeMappingFieldType>(term: T) => Array<bigint>
  = term =>
    term ? [ encodeOrderable(term).orderable ] : []

const indexMatch: (terms: Array<MatchMappingFieldType>) => Array<bigint> = terms => {
  return terms.map(t => encodeEquatable(t).equatable)
}

const buildTextProcessingPipeline: (options: MatchOptions) => TextProcessor = options => {
  let pipeline: Array<TextProcessor> = [loadTextProcessor(options.tokenizer)].concat(options.tokenFilters.map(loadTextProcessor))
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

export type RecordAnalyzer<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
> = (record: R) => AnalyzedRecord<R, M, MM>

export type QueryAnalyzer<
  R extends StashRecord,
  M extends Mappings<R>
> = (query: Query<R, M>) => AnalyzedQuery

export type AnalyzedQuery = {
  constraints: Array<V1.Query.Constraint>
}

const buildFieldExtractor: <
  R extends { [key: string]: any },
  F extends FieldOfType<R, MappableFieldType>
>(field: F) => (record: any) => FieldType<R, F> = field => {
  const path = field.split(".")
  return record => {
    let current = record
    path.forEach(part => { current = current?.[part] })
    return current
  }
}

function encodeMatch(term: string, prf: Buffer, prp: Buffer): ExactConstraint {
  return { term: oreEncryptTermToBuffer(encodeEquatable(term).equatable, prf, prp) };
}

function encodeExact<
  R extends StashRecord,
  M extends Mappings<R>,
  N extends Extract<keyof M, string>
>(
  condition: ExactCondition<R, M, N>,
  prf: Buffer,
  prp: Buffer
): ExactConstraint {
  return { term: oreEncryptTermToBuffer(encodeEquatable(condition.value).equatable, prf, prp) };
}

function encodeRange<
  R extends StashRecord,
  M extends Mappings<R>,
  N extends Extract<keyof M, string>
>(
  condition: RangeCondition<R, M, N>,
  prf: Buffer,
  prp: Buffer
): RangeConstraint {
  const helper = rangeMinMax[condition.op]
  // FIXME: "helper as any" is a type hack
  const { min, max } = (helper as any)(condition)

  return {
    constraint: "range" as const,
    lower: oreEncryptTermToBuffer(min, prf, prp),
    upper: oreEncryptTermToBuffer(max, prf, prp),
  }
}

type RangeConstraint = {
  constraint: "range",
  lower: Buffer,
  upper: Buffer,
}

type ExactConstraint = {
  term: Buffer,
}

type RangeMinMaxHelper = {
  [op in RangeOperator]: <
    R extends StashRecord,
    M extends Mappings<R>,
    N extends Extract<keyof M, string>
  >(
    condition: RangeCondition<R, M, N> & { op: op }
  ) => {
    min: bigint,
    max: bigint
  }
}

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

const rangeMinMax: RangeMinMaxHelper = {
  between: (condition) => ({
    min: encodeOrderable(condition.min).orderable,
    max: encodeOrderable(condition.max).orderable
  }),
  lt: (condition) => ({
    min: UINT64_MIN,
    max: biggest(encodeOrderable(condition.value).orderable - 1n, UINT64_MIN)
  }),
  lte: (condition) => ({
    min: UINT64_MIN,
    max: encodeOrderable(condition.value).orderable
  }),
  gt: (condition) => ({
    min: smallest(encodeOrderable(condition.value).orderable + 1n, UINT64_MAX),
    max: UINT64_MAX
  }),
  gte: (condition) => ({
    min: encodeOrderable(condition.value).orderable,
    max: UINT64_MAX
  }),
  eq: (condition) => ({
    min: encodeOrderable(condition.value).orderable,
    max: encodeOrderable(condition.value).orderable
  }),
}

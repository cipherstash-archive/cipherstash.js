import { V1 } from "@cipherstash/stashjs-grpc";
import { CollectionSchema } from "./collection-schema";
import { TokenFilter, Tokenizer } from "./dsl/filters-and-tokenizers-dsl";
import { DynamicMatchMapping, ExactMappingFieldType, isDynamicMatchMapping, isExactMapping, isMatchMapping, isRangeMapping, isFieldDynamicMatchMapping, MappableFieldType, Mappings, MappingsMeta, MatchMapping, MatchMappingFieldType, MatchOptions, RangeMappingFieldType, FieldDynamicMatchMapping, StashRecord } from "./dsl/mappings-dsl"
import { ConjunctiveCondition, DynamicMatchCondition, ExactCondition, isConjunctiveCondition, isDynamicMatchCondition, isExactCondition, isMatchCondition, isRangeCondition, isFieldDynamicMatchCondition, MatchCondition, Query, RangeCondition, RangeOperator, FieldDynamicMatchCondition } from "./dsl/query-dsl";
import { encodeTerm } from "./encoders/term-encoder";
import { extractStringFields, extractStringFieldsWithPath } from "./string-field-extractor";
import { TextProcessor, textPipeline, standardTokenizer, ngramsTokenizer, downcaseFilter, upcaseFilter } from "./text-processors";
import { FieldOfType, FieldType, unreachable } from "./type-utils";
import { normalizeId } from "./utils";
import { ORE, OrePlainText } from "@cipherstash/ore-rs"

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
  const mappingAnalzers: MappingAnalyzers<R> = Object.entries(schema.mappings).map(([indexName, mapping]) => {
    const meta = schema.meta[indexName]!

    // FIXME: handle missing data in records

    if (isExactMapping<R, FieldOfType<R, ExactMappingFieldType>>(mapping)) {
      const fieldExtractor = buildFieldExtractor(mapping.field)
      const { encrypt } = ORE.init(meta.$prfKey, meta.$prpKey)
      return (record: R) => ({
        indexId: meta.$indexId,
        encryptedTerms: indexExact(encrypt)(fieldExtractor(record))
      })
    }

    if (isRangeMapping<R, FieldOfType<R, RangeMappingFieldType>>(mapping)) {
      const fieldExtractor = buildFieldExtractor(mapping.field)
      const { encrypt } = ORE.init(meta.$prfKey, meta.$prpKey)
      return (record: R) => ({
        indexId: meta.$indexId,
        encryptedTerms: indexRange(encrypt)(fieldExtractor(record))
      })
    }

    if (isMatchMapping<R, FieldOfType<R, MatchMappingFieldType>>(mapping)) {
      const fieldExtractors = mapping.fields.map(f => buildFieldExtractor(f))
      const pipeline = buildTextProcessingPipeline(mapping)
      const { encrypt } = ORE.init(meta.$prfKey, meta.$prpKey)
      return (record: R) => ({
        indexId: meta.$indexId,
        encryptedTerms: indexMatch(encrypt)(pipeline(fieldExtractors.map(fe => fe(record)).filter(t => !!t)))
      })
    }

    if (isDynamicMatchMapping(mapping)) {
      const pipeline = buildTextProcessingPipeline(mapping)
      const { encrypt } = ORE.init(meta.$prfKey, meta.$prpKey)
      return (record: R) => ({
        indexId: meta.$indexId,
        encryptedTerms: indexMatch(encrypt)(pipeline(extractStringFields(record)))
      })
    }

    if (isFieldDynamicMatchMapping(mapping)) {
      const pipeline = buildTextProcessingPipeline(mapping)
      const { encrypt } = ORE.init(meta.$prfKey, meta.$prpKey)
      return (record: R) => ({
        indexId: meta.$indexId,
        encryptedTerms: indexMatch(encrypt)(extractStringFieldsWithPath(record).flatMap(([f, v]) => {
          return pipeline([v]).map(t => `${f}:${t}`)
        }))
      })
    }

    return unreachable(`Internal error: unreachable code reached. Unknown mapping: ${JSON.stringify(mapping)}`)
  })

  return (record: R) => ({
    recordId: record.id,
    indexEntries: mappingAnalzers.map(
      analyzer => analyzer(record)).reduce((acc, { indexId, encryptedTerms }) => {
        if (encryptedTerms.length > 0) {
          return Object.assign(acc, { [indexId]: encryptedTerms })
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
    const { encrypt } = ORE.init(indexMeta.$prfKey, indexMeta.$prpKey)
    return [{
      indexId: normalizeId(indexMeta.$indexId),
      exact: encodeExact(condition, encrypt),
      condition: "exact"
    }]
  } else if (isRangeCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    const { encrypt } = ORE.init(indexMeta.$prfKey, indexMeta.$prpKey)
    return [{
      indexId: normalizeId(indexMeta.$indexId),
      range: encodeRange(condition, encrypt),
      condition: "range"
    }]
  } else if (isMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    const mapping = mappings[condition.indexName]! as MatchMapping<R, FieldOfType<R, MatchMappingFieldType>>
    const pipeline = buildTextProcessingPipeline(mapping)
    const { encrypt } = ORE.init(indexMeta.$prfKey, indexMeta.$prpKey)
    return pipeline([condition.value]).map(term => ({
      indexId: normalizeId(indexMeta.$indexId),
      exact: encodeMatch(term, encrypt),
      condition: "exact"
    }))
  } else if (isDynamicMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    const mapping = mappings[condition.indexName]! as DynamicMatchMapping
    const pipeline = buildTextProcessingPipeline(mapping)
    const { encrypt } = ORE.init(indexMeta.$prfKey, indexMeta.$prpKey)
    return pipeline([condition.value]).map(term => ({
      indexId: Buffer.from(indexMeta.$indexId, 'hex'),
      exact: encodeMatch(term, encrypt),
      condition: "exact"
    }))
  } else if (isFieldDynamicMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    const mapping = mappings[condition.indexName]! as FieldDynamicMatchMapping
    const pipeline = buildTextProcessingPipeline(mapping)
    const { encrypt } = ORE.init(indexMeta.$prfKey, indexMeta.$prpKey)
    return pipeline([condition.value]).map(term => ({
      indexId: Buffer.from(indexMeta.$indexId, 'hex'),
      exact: encodeMatch(`${condition.fieldName}:${term}`, encrypt),
      condition: "exact"
    }))
  } else {
    return unreachable(`Internal error - unknown condition kind: ${JSON.stringify(condition)}`)
  }
}

const indexExact: (encrypt: EncryptFn) => <T extends ExactMappingFieldType>(term: T) => Array<Buffer>
  = encrypt => term => term ? [encrypt(encodeTerm(term))] : []

const indexRange: (encrypt: EncryptFn) => <T extends RangeMappingFieldType>(term: T) => Array<Buffer>
  = encrypt => term => term ? [encrypt(encodeTerm(term))] : []

const indexMatch: (encrypt: EncryptFn) => (terms: Array<MatchMappingFieldType>) => Array<Buffer> = encrypt => terms => {
  return terms.map(t => encrypt(encodeTerm(t)))
}

const buildTextProcessingPipeline: (options: MatchOptions) => TextProcessor = options => {
  let pipeline: Array<TextProcessor> = [loadTextProcessor(options.tokenizer)].concat(options.tokenFilters.map(loadTextProcessor))
  return textPipeline(pipeline)
}

const loadTextProcessor = (filter: TokenFilter | Tokenizer): TextProcessor => {
  switch (filter.kind) {
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

function encodeMatch(term: string, encrypt: EncryptFn): ExactConstraint {
  return { term: encrypt(encodeTerm(term)) };
}

function encodeExact<
  R extends StashRecord,
  M extends Mappings<R>,
  N extends Extract<keyof M, string>
>(
  condition: ExactCondition<R, M, N>,
  encrypt: EncryptFn,
): ExactConstraint {
  return { term: encrypt(encodeTerm(condition.value)) };
}

function encodeRange<
  R extends StashRecord,
  M extends Mappings<R>,
  N extends Extract<keyof M, string>
>(
  condition: RangeCondition<R, M, N>,
  encrypt: EncryptFn
): RangeConstraint {
  const helper = rangeMinMax[condition.op]
  // FIXME: "helper as any" is a type hack
  const { min, max } = (helper as any)(condition)

  return {
    constraint: "range" as const,
    lower: encrypt(min),
    upper: encrypt(max),
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
    min: OrePlainText,
    max: OrePlainText
  }
}

export type AnalyzedRecord<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
  > = {
    recordId: R['id'],
    indexEntries: {
      [F in keyof MM]: Array<Buffer>
    }
  }

const rangeMinMax: RangeMinMaxHelper = {
  between: ({ min, max }) => ORE.encodeRangeBetween(min, max),
  lt: ({ value }) => ORE.encodeRangeLt(value),
  lte: ({ value }) => ORE.encodeRangeLte(value),
  gt: ({ value }) => ORE.encodeRangeGt(value),
  gte: ({ value }) => ORE.encodeRangeGte(value),
  eq: ({ value }) => ORE.encodeRangeEq(value),
}

type MappingAnalyzers<R> = ((record: R) => {
  indexId: string;
  encryptedTerms: Buffer[];
})[]

type EncryptFn = (input: OrePlainText) => Buffer

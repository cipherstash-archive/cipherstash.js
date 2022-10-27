import { V1 } from "@cipherstash/stashjs-grpc"
import { CollectionSchema } from "./collection-schema"
import { TokenFilter, Tokenizer } from "./dsl/filters-and-tokenizers-dsl"
import {
  DynamicMatchMapping,
  Mappings,
  MappingsMeta,
  MatchMapping,
  MatchMappingFieldType,
  MatchOptions,
  FieldDynamicMatchMapping,
  StashRecord,
} from "./dsl/mappings-dsl"
import {
  ConjunctiveCondition,
  DynamicMatchCondition,
  ExactCondition,
  isConjunctiveCondition,
  isDynamicMatchCondition,
  isExactCondition,
  isMatchCondition,
  isRangeCondition,
  isFieldDynamicMatchCondition,
  MatchCondition,
  Query,
  RangeCondition,
  RangeOperator,
  FieldDynamicMatchCondition,
} from "./dsl/query-dsl"
import { asDate, asFloat64, asUint64, encodeTermType } from "./encoders/term-encoder"
import {
  TextProcessor,
  textPipeline,
  standardTokenizer,
  ngramsTokenizer,
  downcaseFilter,
  upcaseFilter,
} from "./text-processors"
import { FieldOfType, unreachable } from "./type-utils"
import { normalizeId } from "./utils"
import { ORE, OrePlainText, RecordIndexer } from "@cipherstash/stash-rs"

import { TermType } from "./record-type-definition"

export function createRecordIndexer<R extends StashRecord, M extends Mappings<R>, MM extends MappingsMeta<M>>(
  schema: CollectionSchema<R, M, MM>
): RecordIndexer {
  return RecordIndexer.init({
    type: schema.recordType,
    indexes: Object.fromEntries(
      Object.entries(schema.mappings).map(([key, mapping]) => [
        key,
        {
          ...mapping,
          prp_key: schema.meta[key]!.$prpKey,
          prf_key: schema.meta[key]!.$prfKey,
          index_id: normalizeId(schema.meta[key]!.$indexId),
        },
      ])
    ),
  })
}

export function buildQueryAnalyzer<R extends StashRecord, M extends Mappings<R>, MM extends MappingsMeta<M>>(
  schema: CollectionSchema<R, M, MM>
): QueryAnalyzer<R, M> {
  return (query: Query<R, M>) => {
    return { constraints: flattenCondition(query, schema.mappings, schema.meta) }
  }
}

function flattenCondition<R extends StashRecord, M extends Mappings<R>, MM extends MappingsMeta<M>>(
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
    const mapping = mappings[condition.indexName]!
    const exactIndexer = indexOneTerm(encrypt, mapping.fieldType)
    return [
      {
        indexId: normalizeId(indexMeta.$indexId),
        exact: { term: exactIndexer(condition.value) },
        condition: "exact",
      },
    ]
  } else if (isRangeCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    const { encrypt } = ORE.init(indexMeta.$prfKey, indexMeta.$prpKey)
    const mapping = mappings[condition.indexName]!
    const helper = createRangeHelpers(mapping.fieldType)[condition.op]
    const { min, max } = (helper as any)(condition)
    return [
      {
        indexId: normalizeId(indexMeta.$indexId),
        range: { lower: [encrypt(min)], upper: [encrypt(max)] },
        condition: "range",
      },
    ]
  } else if (isMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    const mapping = mappings[condition.indexName]! as MatchMapping<R, FieldOfType<R, MatchMappingFieldType>>
    const pipeline = buildTextProcessingPipeline(mapping)
    const { encrypt } = ORE.init(indexMeta.$prfKey, indexMeta.$prpKey)
    const matchIndexer = indexOneTerm(encrypt, "string")
    return pipeline([condition.value]).map(term => ({
      indexId: normalizeId(indexMeta.$indexId),
      exact: { term: matchIndexer(term) },
      condition: "exact",
    }))
  } else if (isDynamicMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    const mapping = mappings[condition.indexName]! as DynamicMatchMapping
    const pipeline = buildTextProcessingPipeline(mapping)
    const { encrypt } = ORE.init(indexMeta.$prfKey, indexMeta.$prpKey)
    const matchIndexer = indexOneTerm(encrypt, "string")
    return pipeline([condition.value]).map(term => ({
      indexId: normalizeId(indexMeta.$indexId),
      exact: { term: matchIndexer(term) },
      condition: "exact",
    }))
  } else if (isFieldDynamicMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    const mapping = mappings[condition.indexName]! as FieldDynamicMatchMapping
    const pipeline = buildTextProcessingPipeline(mapping)
    const { encrypt } = ORE.init(indexMeta.$prfKey, indexMeta.$prpKey)
    const matchIndexer = indexOneTerm(encrypt, "string")
    return pipeline([condition.value]).map(term => ({
      indexId: normalizeId(indexMeta.$indexId),
      exact: { term: matchIndexer(`${condition.fieldName}:${term}`) },
      condition: "exact",
    }))
  } else {
    return unreachable(`Internal error - unknown condition kind: ${JSON.stringify(condition)}`)
  }
}

function indexOneTerm(encrypt: EncryptFn, termType: TermType): (term: any) => Array<Buffer> {
  const encoder = encodeTermType(termType)
  return term => encoder(term).map(encrypt)
}

const buildTextProcessingPipeline: (options: MatchOptions) => TextProcessor = options => {
  let pipeline: Array<TextProcessor> = [loadTextProcessor(options.tokenizer)].concat(
    options.tokenFilters.map(loadTextProcessor)
  )
  return textPipeline(pipeline)
}

const loadTextProcessor = (filter: TokenFilter | Tokenizer): TextProcessor => {
  switch (filter.kind) {
    case "standard":
      return standardTokenizer
    case "ngram":
      return ngramsTokenizer({ tokenLength: filter.tokenLength })
    case "downcase":
      return downcaseFilter
    case "upcase":
      return upcaseFilter
  }
}

export type RecordAnalyzer<R extends StashRecord, M extends Mappings<R>, MM extends MappingsMeta<M>> = (
  record: R
) => AnalyzedRecord<R, M, MM>

export type QueryAnalyzer<R extends StashRecord, M extends Mappings<R>> = (query: Query<R, M>) => AnalyzedQuery

export type AnalyzedQuery = {
  constraints: Array<V1.Query.Constraint>
}

type RangeMinMaxHelper = {
  [op in RangeOperator]: <R extends StashRecord, M extends Mappings<R>, N extends Extract<keyof M, string>>(
    condition: RangeCondition<R, M, N> & { op: op }
  ) => {
    min: OrePlainText
    max: OrePlainText
  }
}

export type AnalyzedRecord<R extends StashRecord, M extends Mappings<R>, MM extends MappingsMeta<M>> = {
  recordId: R["id"]
  indexEntries: {
    [F in keyof MM]: Array<Array<Buffer>>
  }
}

const createRangeHelpers = (termType: TermType): RangeMinMaxHelper => {
  const cast = (term: unknown) => {
    switch (termType) {
      case "uint64":
        return asUint64(term)
      case "date":
        return asDate(term)
      case "float64":
        return asFloat64(term)
      default:
        throw new Error(`Data type "${termType}" is not supported for operations on ranges`)
    }
  }

  return {
    between: ({ min, max }) => ORE.encodeRangeBetween(cast(min), cast(max)),
    lt: ({ value }) => ORE.encodeRangeLt(cast(value)),
    lte: ({ value }) => ORE.encodeRangeLte(cast(value)),
    gt: ({ value }) => ORE.encodeRangeGt(cast(value)),
    gte: ({ value }) => ORE.encodeRangeGte(cast(value)),
    eq: ({ value }) => ORE.encodeRangeEq(cast(value)),
  }
}

type EncryptFn = (input: OrePlainText) => Buffer

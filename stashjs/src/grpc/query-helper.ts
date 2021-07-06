import { V1 } from "@cipherstash/stashjs-grpc";
import { CipherSuite } from "../crypto/cipher";
import { oreEncryptTermToBuffer } from "../crypto/ore";
import { StashRecord, Mappings, MappingsMeta } from "../dsl/mappings-dsl"
import { Query, RangeOperator, RangeCondition, ExactCondition, MatchCondition, DynamicMatchCondition, isConjunctiveCondition, isExactCondition, ConjunctiveCondition, isRangeCondition, isMatchCondition, isDynamicMatchCondition, isScopedDynamicMatchCondition, ScopedDynamicMatchCondition } from "../dsl/query-dsl"
import { encodeEquatable, encodeOrderable, UINT64_MIN, UINT64_MAX } from "../encoders/term-encoder"
import { unreachable } from "../type-utils"
import { biggest, smallest } from "../utils"

export function convertQueryToContraints<
  R extends StashRecord,
  M extends Mappings<R>,
  Q extends Query<R, M>,
  MM extends MappingsMeta<M>
>(
  query: Q,
  meta: MM
): V1.ConstraintInput[] {
  return flattenCondition<R, M, MM>(query, meta)
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
      | ScopedDynamicMatchCondition<R, M, Extract<keyof M, string>>,
    meta: MM
  ): Array<V1.ConstraintInput> {

  if (isConjunctiveCondition<R, M>(condition)) {
    return condition.conditions.flatMap(c => flattenCondition<R, M, MM>(c, meta))
  } else if (isExactCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    return [{
      indexId: Buffer.from(indexMeta.$indexId, 'hex'),
      exact: encodeExact(condition, indexMeta.$prf, indexMeta.$prp),
      condition: "exact"
    }]
  } else if (isRangeCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    return [{
      indexId: Buffer.from(indexMeta.$indexId, 'hex'),
      range: encodeRange(condition, indexMeta.$prf, indexMeta.$prp),
      condition: "range"
    }]
  } else if (isMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    return [{
      indexId: Buffer.from(indexMeta.$indexId, 'hex'),
      exact: encodeMatch(condition, indexMeta.$prf, indexMeta.$prp),
      condition: "exact"
    }]
  } else if (isDynamicMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    return [{
      indexId: Buffer.from(indexMeta.$indexId, 'hex'),
      exact: encodeDynamicMatch(condition, indexMeta.$prf, indexMeta.$prp),
      condition: "exact"
    }]
  } else if (isScopedDynamicMatchCondition<R, M, Extract<keyof M, string>>(condition)) {
    const indexMeta = meta[condition.indexName]!
    return [{
      indexId: Buffer.from(indexMeta.$indexId, 'hex'),
      exact: encodeScopedDynamicMatch(condition, indexMeta.$prf, indexMeta.$prp),
      condition: "exact"
    }]
  } else {
    return unreachable(`Internal error - unknown condition kind: ${JSON.stringify(condition)}`)
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

function encodeMatch<
  R extends StashRecord,
  M extends Mappings<R>,
  N extends Extract<keyof M, string>
>(
  condition: MatchCondition<R, M, N>,
  prf: Buffer,
  prp: Buffer
): ExactConstraint {
  // FIXME - URGENT this needs to go through the same processing pipeline as initial indexing!!!!
  return { term: oreEncryptTermToBuffer(encodeEquatable(condition.value).equatable, prf, prp) };
}

function encodeDynamicMatch<
  R extends StashRecord,
  M extends Mappings<R>,
  N extends Extract<keyof M, string>
>(
  condition: DynamicMatchCondition<R, M, N>,
  prf: Buffer,
  prp: Buffer
): ExactConstraint {
  // FIXME - URGENT this needs to go through the same processing pipeline as initial indexing!!!!
  return { term: oreEncryptTermToBuffer(encodeEquatable(condition.value).equatable, prf, prp) };
}

function encodeScopedDynamicMatch<
  R extends StashRecord,
  M extends Mappings<R>,
  N extends Extract<keyof M, string>
>(
  condition: ScopedDynamicMatchCondition<R, M, N>,
  prf: Buffer,
  prp: Buffer
): ExactConstraint {
  // FIXME - URGENT this needs to go through the same processing pipeline as initial indexing!!!!
  return { term: oreEncryptTermToBuffer(encodeEquatable(condition.value).equatable, prf, prp) };
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

export async function convertQueryReplyToUserRecords<
  R extends StashRecord
>(
  output: V1.QueryReplyOutput,
  cipherSuite: CipherSuite
): Promise<Array<R>> {
  return await Promise.all(output.result!.map(async encryptedSource =>
    await cipherSuite.decrypt(encryptedSource)
  )) as unknown as Array<R>
}
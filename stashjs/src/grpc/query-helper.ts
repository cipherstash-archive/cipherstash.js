import { V1 } from "@cipherstash/stashjs-grpc";
import { CipherSuite } from "../crypto/cipher";
import { oreEncryptTermToBuffer } from "../crypto/ore";
import { StashRecord, Mappings, MappingsMeta } from "../dsl/mappings-dsl"
import { Query, RangeOperator, RangeCondition, ExactCondition, MatchCondition, isConjunctiveCondition, isIndexValueCondition, Condition } from "../dsl/query-dsl"
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
    condition: Condition<R, M>,
    meta: MM
  ): Array<V1.ConstraintInput> {

  if (isConjunctiveCondition<R, M>(condition)) {
    return condition.conditions.flatMap(c => flattenCondition<R, M, MM>(c, meta))
  } else if (isIndexValueCondition<R, M>(condition)) {
    const indexMeta = meta[condition.indexName]!
    return [{
      indexId: Buffer.from(indexMeta.$indexId, 'hex'),
      [condition.kind]: encodeTerms(condition, indexMeta.$prf, indexMeta.$prp),
      condition: condition.kind == "match" ? "exact" : condition.kind
    }]
  } else {
    return unreachable(`Internal error - unknown condition kind: ${JSON.stringify(condition)}`)
  }
}

function encodeTerms<
  R extends StashRecord,
  M extends Mappings<R>,
  N extends Extract<keyof M, string>
>(
  condition:
    | ExactCondition<R, M, N>
    | RangeCondition<R, M, N>
    | MatchCondition<R, M, N>,
  prf: Buffer,
  prp: Buffer
): ExactConstraint | RangeConstraint {
  switch (condition.kind) {
    case "exact": return encodeExact(condition, prf, prp)
    case "range": return encodeRange(condition, prf, prp)
    case "match": return encodeMatch(condition, prf, prp)
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
  [op in RangeOperator]:
    op extends "between" ? <R extends StashRecord, M extends Mappings<R>, N extends Extract<keyof M, string>>(condition: RangeCondition<R, M, N> & { op: op }) => { min: bigint, max: bigint }
    :op extends "lt" ? <R extends StashRecord, M extends Mappings<R>, N extends Extract<keyof M, string>>(condition: RangeCondition<R, M, N> & { op: op }) => { min: bigint, max: bigint }
    :op extends "lte" ? <R extends StashRecord, M extends Mappings<R>, N extends Extract<keyof M, string>>(condition: RangeCondition<R, M, N> & { op: op }) => { min: bigint, max: bigint }
    :op extends "gt" ? <R extends StashRecord, M extends Mappings<R>, N extends Extract<keyof M, string>>(condition: RangeCondition<R, M, N> & { op: op }) => { min: bigint, max: bigint }
    :op extends "gte" ? <R extends StashRecord, M extends Mappings<R>, N extends Extract<keyof M, string>>(condition: RangeCondition<R, M, N> & { op: op }) => { min: bigint, max: bigint }
    :op extends "eq" ? <R extends StashRecord, M extends Mappings<R>, N extends Extract<keyof M, string>>(condition: RangeCondition<R, M, N> & { op: op }) => { min: bigint, max: bigint }
    : never
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

function encodeMatch<R extends StashRecord, M extends Mappings<R>, N extends Extract<keyof M, string>>(condition: MatchCondition<R, M, N>, prf: Buffer, prp: Buffer): ExactConstraint {
  return { term: oreEncryptTermToBuffer(encodeEquatable(condition.value).equatable, prf, prp) };
}

function encodeExact<R extends StashRecord, M extends Mappings<R>, N extends Extract<keyof M, string>>(condition: ExactCondition<R, M, N>, prf: Buffer, prp: Buffer): ExactConstraint {
  return { term: oreEncryptTermToBuffer(encodeEquatable(condition.value).equatable, prf, prp) };
}

function encodeRange<R extends StashRecord, M extends Mappings<R>, N extends Extract<keyof M, string>>(condition: RangeCondition<R, M, N>, prf: Buffer, prp: Buffer): RangeConstraint {
  const helper = rangeMinMax[condition.op] 
  const { min, max } = helper(condition as any)

  return {
    constraint: "range" as const,
    lower: oreEncryptTermToBuffer(min, prf, prp),
    upper: oreEncryptTermToBuffer(max, prf, prp),
  }
}

export async function convertQueryReplyToUserRecords<R extends StashRecord>(output: V1.QueryReplyOutput, cipherSuite: CipherSuite): Promise<Array<R>> {
  return await Promise.all(output.result!.map(async encryptedSource => await cipherSuite.decrypt(encryptedSource))) as unknown as Array<R>
}
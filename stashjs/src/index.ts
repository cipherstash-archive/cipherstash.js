export {
  StashProfile,
} from './stash-profile'

export { Stash } from "./stash"

export {
  Aggregate,
  AggregateResult,
  AggregationOptions,
  Collection,
  CollectionMetadata,
  Ordering,
  OrderingOptions,
  QueryOptions,
  QueryResult,
} from "./collection"

export {
  CollectionSchema,
  QueryBuilderCallback
} from "./collection-schema"

export {
  DynamicMatchMapping,
  ExactMapping,
  ExactMappingFieldType,
  FieldDynamicMatchMapping,
  FieldTypeOfMapping,
  HasID,
  MappableFieldType,
  MappingOn,
  Mappings,
  MappingsDSL,
  MappingsMeta,
  MatchMapping,
  MatchMappingFieldType,
  MatchOptions,
  RangeMapping,
  RangeMappingFieldType,
  StashRecord,
  isDynamicMatchMapping,
  isExactMapping,
  isFieldDynamicMatchMapping,
  isMatchMapping,
  isRangeMapping,
} from "./dsl/mappings-dsl"

export {
  AllCondition,
  Condition,
  ConjunctiveCondition,
  DynamicMatchCondition,
  DynamicMatchOperators,
  ExactCondition,
  ExactOperators,
  FieldDynamicMatchCondition,
  FieldDynamicMatchOperators,
  IndexCondition,
  MatchCondition,
  MatchOperators,
  OperatorsForIndex,
  Query,
  QueryBuilder,
  RangeCondition,
  RangeOperator,
  RangeOperators,
  all,
} from './dsl/query-dsl'

export {
  downcase,
  ngram,
  standard,
  upcase,
} from "./dsl/filters-and-tokenizers-dsl";

export {
  FieldOfType
} from './type-utils'

export {
  describeError
} from './utils'

export {
  OauthAuthenticationInfo,
  stashOauth
} from './auth/oauth-utils'

export {
  configStore,
  defaults
} from './auth/config-store'
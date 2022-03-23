import 'source-map-support/register'

export {
  StashConfiguration,
} from './stash-config'

export {
  StashProfile,
} from './stash-profile'

export { StashInternal } from "./stash-internal"
export { Stash } from "./stash"

export {
  Aggregate,
  AggregateResult,
  AggregationOptions,
  CollectionInternal,
  CollectionMetadata,
  Ordering,
  OrderingOptions,
  QueryOptions,
  QueryResult,
} from "./collection-internal"

export {
  Collection,
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
  describeError,
  streamPlaintextRecords as streamRecords
} from './utils'

export {
  OauthAuthenticationInfo,
  stashOauth
} from './auth/oauth-utils'

export {
  profileStore,
  defaults
} from './auth/profile-store'

export * as errors from './errors'

export * from './result'

export {
  CollectionSchemaDefinition,
  generateSchemaDefinitionFromJSON
} from './parsers/collection-schema-parser'


import { warnIfNoTypeScript } from './warn-if-no-typescript';

// Whenever stashjs is imported warn if TypeScript isn't installed.
warnIfNoTypeScript();

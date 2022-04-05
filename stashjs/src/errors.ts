import { isObject } from "./guards"
import { assertValueNever, unreachable } from "./type-utils"
import { logger } from './logger';

/**
 * An enumeration of all errors that can be thrown by CipherStash.
 *
 * These errors can all be verified by the compiler as handled statically using
 * exhaustiveness checks.
 */
export type ErrorTag =
  | 'AnalysisFailure'
  | 'AuthenticationFailure'
  | 'AWSFederationFailure'
  | 'CollectionCreationFailure'
  | 'CollectionDeleteFailure'
  | 'CollectionLoadFailure'
  | 'CollectionListFailure'
  | 'ConnectionFailure'
  | 'DecryptionFailure'
  | 'DeleteProfileFailure'
  | 'DocumentDeleteFailure'
  | 'DocumentGetFailure'
  | 'DocumentGetAllFailure'
  | 'DocumentPutFailure'
  | 'DocumentQueryFailure'
  | 'EncryptionFailure'
  | 'GRPCError'
  | 'IllegalStateError'
  | 'IOError'
  | 'KMSError'
  | 'LoadProfileFailure'
  | 'LoadProfileNamesFailure'
  | 'MalformedConfigFile'
  | 'MissingConfigDir'
  | 'MissingProfile'
  | 'NativeError'
  | 'NoDefaultProfileSet'
  | 'OAuthFailure'
  | 'PlainError'
  | 'QueryBuilderFailure'
  | 'SaveProfileFailure'
  | 'SetDefaultProfileFailure'
  | 'StreamingPutFailure'
  | 'TokenValidationFailure'

export type JSError = InstanceType<ErrorConstructor>

export type NativeError = {
  readonly tag: 'NativeError'
  readonly cause: JSError
  readonly caller: CallerInfo
}

/**
 * A StashJSError is an error that is not backed by a native JavaScript error (or
 * one of its subclasses). It does not provide a stack trace.
 *
 * Instances of StashJSError will have a statically known list of causes which the
 * compiler can use to perform exhaustiveness checks should the handler of the
 * error want to alter behaviour based on the underlying cause.
 */
export type StashJSError<Tag extends ErrorTag, Cause = undefined>
  = Tag extends 'PlainError' ? {
    readonly tag: Tag
    readonly message: string
    readonly caller: CallerInfo
  } : Tag extends 'NativeError' ? {
    readonly tag: Tag
    readonly cause: JSError
    readonly caller: CallerInfo
  } : {
    readonly tag: Tag
    readonly message?: string
    readonly cause?: Cause
    readonly caller: CallerInfo
  }

export type GRPCError = StashJSError<'GRPCError', NativeError | AuthenticationFailure>
export const GRPCError: (cause: GRPCError["cause"]) => GRPCError = (cause) => addCaller(({ tag: 'GRPCError', cause: wrap(cause) }))

export type AnalysisFailure = StashJSError<'AnalysisFailure', EncryptionFailure | AuthenticationFailure>
export const AnalysisFailure: (cause: AnalysisFailure["cause"]) => AnalysisFailure = (cause) => addCaller(({ tag: 'AnalysisFailure', cause }))

export type CollectionCreationFailure = StashJSError<'CollectionCreationFailure', EncryptionFailure | DecryptionFailure | GRPCError>
export const CollectionCreationFailure: (cause: CollectionCreationFailure["cause"]) => CollectionCreationFailure = (cause) => addCaller(({ tag: 'CollectionCreationFailure', cause }))

export type CollectionLoadFailure = StashJSError<'CollectionLoadFailure', DecryptionFailure | GRPCError>
export const CollectionLoadFailure: (cause: CollectionLoadFailure["cause"]) => CollectionLoadFailure = (cause) => addCaller(({ tag: 'CollectionLoadFailure', cause }))

export type CollectionDeleteFailure = StashJSError<'CollectionDeleteFailure', GRPCError>
export const CollectionDeleteFailure: (collectionName: string) => (cause: CollectionDeleteFailure["cause"]) => CollectionDeleteFailure = (collectionName) => (cause) => addCaller(({ tag: 'CollectionDeleteFailure', cause, message: `Could not delete collection "${collectionName}"` }))

export type CollectionListFailure = StashJSError<'CollectionListFailure', DecryptionFailure | GRPCError>
export const CollectionListFailure: (cause: CollectionListFailure["cause"]) => CollectionListFailure = (cause) => addCaller(({ tag: 'CollectionListFailure', cause }))

export type DocumentDeleteFailure = StashJSError<'DocumentDeleteFailure', GRPCError | AuthenticationFailure>
export const DocumentDeleteFailure: (cause: DocumentDeleteFailure["cause"]) => DocumentDeleteFailure = (cause) => addCaller(({ tag: 'DocumentDeleteFailure', cause }))

export type DocumentGetFailure = StashJSError<'DocumentGetFailure', DecryptionFailure | GRPCError | AuthenticationFailure>
export const DocumentGetFailure: (cause: DocumentGetFailure["cause"]) => DocumentGetFailure = (cause) => addCaller(({ tag: 'DocumentGetFailure', cause }))

export type DocumentGetAllFailure = StashJSError<'DocumentGetAllFailure', DecryptionFailure | GRPCError | AuthenticationFailure>
export const DocumentGetAllFailure: (cause: DocumentGetAllFailure["cause"]) => DocumentGetAllFailure = (cause) => addCaller(({ tag: 'DocumentGetAllFailure', cause }))

export type DocumentPutFailure = StashJSError<'DocumentPutFailure', EncryptionFailure | GRPCError | AuthenticationFailure>
export const DocumentPutFailure: (cause: DocumentPutFailure["cause"]) => DocumentPutFailure = (cause) => addCaller(({ tag: 'DocumentPutFailure', cause }))

export type QueryBuilderFailure = StashJSError<'QueryBuilderFailure', NativeError>;
export const QueryBuilderFailure = (cause: QueryBuilderError): QueryBuilderFailure => addCaller({ tag: 'QueryBuilderFailure', cause: wrap(cause) })

export type DocumentQueryFailure = StashJSError<'DocumentQueryFailure', DecryptionFailure | GRPCError | AuthenticationFailure | QueryBuilderFailure>
export const DocumentQueryFailure: (cause: DocumentQueryFailure["cause"]) => DocumentQueryFailure = (cause) => addCaller(({ tag: 'DocumentQueryFailure', cause }))


export type MissingConfigDir = StashJSError<'MissingConfigDir'>
export const MissingConfigDir: () => MissingConfigDir = () => addCaller(({ tag: 'MissingConfigDir' }))

export type NoDefaultProfileSet = StashJSError<'NoDefaultProfileSet'>
export const NoDefaultProfileSet: () => NoDefaultProfileSet = () => addCaller(({ tag: 'NoDefaultProfileSet' }))

export type MissingProfile = StashJSError<'MissingProfile'>
export const MissingProfile: (profileName: string) => MissingProfile = (profileName) => addCaller(({ tag: 'MissingProfile', message: `Missing or incomplete profile "${profileName}""` }))

export type MalformedConfigFile = StashJSError<'MalformedConfigFile'>
export const MalformedConfigFile: (profileName: string) => MalformedConfigFile = (fileName) => addCaller(({ tag: 'MalformedConfigFile', message: `Could not parse config file "${fileName}"` }))

export type IOError = StashJSError<'IOError', NativeError | PlainError >
export const IOError: (cause: IOError["cause"]) => IOError = (cause) => addCaller(({ tag: 'IOError', cause: wrap(cause) }))

export type LoadProfileFailure = StashJSError<'LoadProfileFailure', MissingConfigDir | NoDefaultProfileSet | MissingProfile | MalformedConfigFile | IOError>
export const LoadProfileFailure: (cause: LoadProfileFailure["cause"]) => LoadProfileFailure = (cause) => addCaller(({ tag: 'LoadProfileFailure', cause }))

export type DeleteProfileFailure = StashJSError<'DeleteProfileFailure', MissingConfigDir | MissingProfile | NoDefaultProfileSet | IOError>
export const DeleteProfileFailure: (cause: DeleteProfileFailure["cause"]) => DeleteProfileFailure = (cause) => addCaller(({ tag: 'DeleteProfileFailure', cause }))

export type LoadProfileNamesFailure = StashJSError<'LoadProfileNamesFailure', MissingConfigDir | IOError>
export const LoadProfileNamesFailure: (cause: LoadProfileNamesFailure["cause"]) => LoadProfileNamesFailure = (cause) => addCaller(({ tag: 'LoadProfileNamesFailure', cause, message: "Could not load available profile names" }))

export type SetDefaultProfileFailure = StashJSError<'SetDefaultProfileFailure', MissingConfigDir | MissingProfile | IOError>
export const SetDefaultProfileFailure: (cause: SetDefaultProfileFailure["cause"]) => SetDefaultProfileFailure = (cause) => addCaller(({ tag: 'SetDefaultProfileFailure', cause, message: "Could not set default profile" }))

export type SaveProfileFailure = StashJSError<'SaveProfileFailure', SetDefaultProfileFailure | MissingConfigDir | IOError>
export const SaveProfileFailure: (cause: SaveProfileFailure["cause"]) => SaveProfileFailure = (cause) => addCaller(({ tag: 'SaveProfileFailure', cause }))

export type OAuthFailure = StashJSError<'OAuthFailure', NativeError | PlainError>
export const OAuthFailure: (cause: OAuthFailure["cause"], message?: string) => OAuthFailure = (cause, message) => {
  if (typeof message === 'undefined') {
    return addCaller(({ tag: 'OAuthFailure', cause: wrap(cause) }))
  } else {
    return addCaller(({ tag: 'OAuthFailure', message, cause: wrap(cause) }))
  }
}

export type TokenValidationFailure = StashJSError<'TokenValidationFailure', NativeError | PlainError | undefined>;
export const TokenValidationFailure = (message: string, cause?: TokenValidationFailure['cause']): TokenValidationFailure  => {
  return addCaller({ tag: 'TokenValidationFailure', cause: cause && wrap(cause), message });
}

export type PlainError = StashJSError<'PlainError', undefined>
export const PlainError: (message: string) => PlainError = message => addCaller(({ tag: 'PlainError', message }))

export type IllegalStateError = StashJSError<'IllegalStateError'>
export const IllegalStateError: (message: string) => IllegalStateError = (message) => addCaller(({ tag: 'IllegalStateError', message }))

export type AuthenticationFailure = StashJSError<'AuthenticationFailure', OAuthFailure | AWSFederationFailure | SaveProfileFailure | IllegalStateError | KMSError | TokenValidationFailure>
export const AuthenticationFailure: (cause: AuthenticationFailure["cause"], message?: string) => AuthenticationFailure = (cause, message) => addCaller(({ tag: 'AuthenticationFailure', cause, message }))

export type ConnectionFailure = StashJSError<'ConnectionFailure', LoadProfileFailure | AuthenticationFailure | KMSError>
export const ConnectionFailure: (cause: ConnectionFailure['cause']) => ConnectionFailure = (cause) => addCaller(({ tag: 'ConnectionFailure', cause }))

export type KMSError = StashJSError<'KMSError', NativeError | PlainError >
export const KMSError: (cause: unknown, message?: string) => KMSError = (cause, message) => addCaller(({ tag: 'KMSError', cause: wrap(cause), message }))

export type AWSFederationFailure = StashJSError<'AWSFederationFailure', NativeError | PlainError >
export const AWSFederationFailure: (cause: unknown, message?: string) => AWSFederationFailure = (cause, message) => addCaller(({ tag: 'AWSFederationFailure', cause: wrap(cause), message }))

export type DecryptionFailure = StashJSError<'DecryptionFailure', NativeError | AuthenticationFailure>
export const DecryptionFailure: (cause: DecryptionFailure["cause"]) => DecryptionFailure = (cause) => addCaller(({ tag: 'DecryptionFailure', cause }))

export type EncryptionFailure = StashJSError<'EncryptionFailure', NativeError | PlainError >
export const EncryptionFailure: (cause: unknown) => EncryptionFailure = (cause) => addCaller(({ tag: 'EncryptionFailure', cause: wrap(cause) }))

export type StreamingPutFailure = StashJSError<'StreamingPutFailure', NativeError | GRPCError | AuthenticationFailure>
export const StreamingPutFailure: (cause: StreamingPutFailure["cause"]) => StreamingPutFailure = (cause) => addCaller(({ tag: 'StreamingPutFailure', cause }))

// JS can throw and catch any type (not only Error and its sub-classes).  So we
// wrap it in a JS error if it wasn't actually an error otherwise we return the
// original error unmodified. The reason why we wrap in an error is to get a
// stack trace.
export const wrap
  : (thrown: unknown) => NativeError
  = (thrown) => {
    if (thrown instanceof Error) {
      return addCaller({ tag: 'NativeError', cause: thrown })
    } else if ((thrown as any)?.tag === 'NativeError') {
      return addCaller(thrown) as any as NativeError
    } else {
      throw unreachable("If we get here then something is trying to wrap an error that is not an Error or NativeError")
    }
  }

export function simpleDescriptionForError<Cause, E extends StashJSError<ErrorTag, Cause>>(error: E): string {
  switch (error.tag) {
    case 'AnalysisFailure': return `[AnalysisFailure] Analysis of a record failed (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'AuthenticationFailure': return `[AuthenticationFailure] Authentication failed (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'AWSFederationFailure': return `[AWSFederationFailure] Failed to federate credentials to AWS (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'CollectionCreationFailure': return `[CollectionCreationFailure] Failed to create collection (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'CollectionDeleteFailure': return `[CollectionDeleteFailure] Failed to delete collection (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'CollectionLoadFailure': return `[CollectionLoadFailure] Failed to load collection (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'CollectionListFailure': return `[CollectionListFailure] Failed to list collections (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'ConnectionFailure': return `[ConnectionFailure] Failed to connect to StashJS service (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'DecryptionFailure': return `[DecryptionFailure] Failed to decrypt (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'DeleteProfileFailure': return `[DeleteProfileFailure] Failed to delete profile config or auth token (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'DocumentDeleteFailure': return `[DocumentDeleteFailure] Failed to delete document from a collection (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'DocumentGetFailure': return `[DocumentGetFailure] Failed to get document from collection (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'DocumentGetAllFailure': return `[DocumentGetAllFailure] Failed to get all documents from collection (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'DocumentPutFailure': return `[DocumentPutFailure] Failed to put document in collection (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'DocumentQueryFailure': return `[DocumentQueryFailure] Failed to query documents (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'EncryptionFailure': return `[EncryptionFailure] Failed to encrypt (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'GRPCError': return `[GRPCError] GRPC Error (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'IllegalStateError': return `[IllegalStateError] An internal error occurred: this is bug in StashJS (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'IOError': return `[IOError] Error occurred reading or writing to the filesystem or the network (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'KMSError': return `[KMSError] KMS error (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'LoadProfileFailure': return `[LoadProfileFailure] Failed to load Stash profile (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'LoadProfileNamesFailure': return `[LoadProfileNamesFailure] Failed to load Stash profile names (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'MalformedConfigFile': return `[MalformedConfigFile] Stash profile was malformed (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'MissingConfigDir': return `[MissingConfigDir] Stash config directory not found (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'MissingProfile': return `[MissingProfile] Stash profile not found (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'NoDefaultProfileSet': return `[NoDefaultProfileSet] No default Stash profile is set and StashJS was initiated without naming a specific profile (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'OAuthFailure': return `[OAuthFailure] OAuth authentication failed (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'PlainError': return `${error.message} (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'NativeError': return `[JSError: ${(error.cause as any).name}]`
    case 'QueryBuilderFailure': return `[QueryBuilderFailure] Query used invalid index or operator (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'SaveProfileFailure': return `[SaveProfileFailure] Failed to save profile (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'SetDefaultProfileFailure': return `[SetDefaultProfileFailure] Failed to set the default profile (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'StreamingPutFailure': return `[StreamingPutFailure] Failure during streaming bulk upsert (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    case 'TokenValidationFailure': return `[TokenValidationFailure] Failure while validating access token (${error.caller.function} in ${error.caller.module}:${error.caller.line})`
    default: {
      // This ensures that the switch is exhaustive, since this code path is only hit when something goes very wrong
      assertValueNever(error);

      logger.info("Method simpleDescriptionForError was calld with a non-StashJSError object");
      logger.info(String(error));

      return `[UnknownError] An unknown error occurred`;
    }
  }
}

function simpleDescriptionForErrorWithMessage<Cause, E extends StashJSError<ErrorTag, Cause>>(error: E): string {
  const desc = simpleDescriptionForError(error)
  if (error.tag === 'PlainError') {
    return desc
  } else if (error.tag !== 'NativeError') {
    if (error.message) {
      return `${desc} (${error.message})`
    }
  } else if (error.tag === 'NativeError') {
    if (error.cause.message) {
      return `${desc} (${error.cause.message})`
    }
  }
  return desc
}

export function isAnyStashJSError(value: unknown): value is StashJSError<ErrorTag, unknown> {
  return !!value && isObject(value) && 'tag' in value && 'caller' in value;
}

export function toErrorMessage<Cause, E extends StashJSError<ErrorTag, Cause>>(error: E, indentation: number = 0): string {
  if (error.tag === 'PlainError') {
    return withIndentation(indentation, simpleDescriptionForErrorWithMessage(error))
  } else if (error.tag === 'NativeError') {
    return withIndentation(indentation, simpleDescriptionForErrorWithMessage(error)) +
          "\n" + (error.cause.stack?.split(/\n/).map(line => withIndentation(indentation + 4, line)).join("\n"))
  } else {
    if (error.cause) {
      return `${withIndentation(indentation, simpleDescriptionForErrorWithMessage(error))}\n${toErrorMessage((error.cause as any), indentation + 4)}`
    } else {
      return withIndentation(indentation, simpleDescriptionForErrorWithMessage(error))
    }
  }
}

function withIndentation(indentation: number, text: string): string {
  if (indentation === 0) {
    return text
  } else {
    return `${Array(Math.max(0, indentation - 3)).fill(" ").join("")} └ ${text}`
  }
}

const STACK_FRAME_RE = new RegExp(/at ((\S+)\s)?\(?([^:]+):(\d+):(\d+)/)

type CallerInfo = {
  function: string
  module: string
  line: number
  column: number
}

function getCaller(): CallerInfo {
  let err = new Error()
  Error.captureStackTrace(err)

  let frames = (err.stack?.split('\n') || []).filter(keepFrame)

  if (frames.length > 0) {
    let callerInfo = STACK_FRAME_RE.exec(frames[0]!)

    if (callerInfo) {
      return {
        function: callerInfo[2]!,
        module: callerInfo[3]!,
        line: parseInt(callerInfo[4]!, 10),
        column: parseInt(callerInfo[5]!, 10)
      }
    }
  }
  return {
    function: "<unknown>",
    module: "<unknown>",
    line: 0,
    column: 0
  }
}

function addCaller<T>(err: T): T & { caller: CallerInfo } {
  return { ...err, caller: getCaller() }
}

function keepFrame(frame: string): boolean {
  return !frame.includes("errors.ts") &&
    !frame.includes("result.ts") &&
    !frame.includes("node:internal") &&
    frame.match(STACK_FRAME_RE) !== null
}

export class QueryBuilderError extends Error {
  constructor(message: string) {
    super(message);
  }
}

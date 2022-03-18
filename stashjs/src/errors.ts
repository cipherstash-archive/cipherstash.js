import { unreachable } from "./type-utils"

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
  | 'SaveProfileFailure'
  | 'SetDefaultProfileFailure'
  | 'StreamingPutFailure'

export type JSError = InstanceType<ErrorConstructor>

export type NativeError = {
  readonly tag: 'NativeError'
  readonly cause: JSError
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
  } : Tag extends 'NativeError' ? {
    readonly tag: Tag
    readonly cause: JSError
  } : {
    readonly tag: Tag
    readonly message?: string
    readonly cause?: Cause
  }

export type GRPCError = StashJSError<'GRPCError', NativeError | AuthenticationFailure>
export const GRPCError: (cause: GRPCError["cause"]) => GRPCError = (cause) => ({ tag: 'GRPCError', cause: wrap(cause) })

export type AnalysisFailure = StashJSError<'AnalysisFailure', EncryptionFailure | AuthenticationFailure>
export const AnalysisFailure: (cause: AnalysisFailure["cause"]) => AnalysisFailure = (cause) => ({ tag: 'AnalysisFailure', cause })

export type CollectionCreationFailure = StashJSError<'CollectionCreationFailure', EncryptionFailure | DecryptionFailure | GRPCError>
export const CollectionCreationFailure: (cause: CollectionCreationFailure["cause"]) => CollectionCreationFailure = (cause) => ({ tag: 'CollectionCreationFailure', cause })

export type CollectionLoadFailure = StashJSError<'CollectionLoadFailure', DecryptionFailure | GRPCError>
export const CollectionLoadFailure: (cause: CollectionLoadFailure["cause"]) => CollectionLoadFailure = (cause) => ({ tag: 'CollectionLoadFailure', cause })

export type CollectionDeleteFailure = StashJSError<'CollectionDeleteFailure', GRPCError>
export const CollectionDeleteFailure: (collectionName: string) => (cause: CollectionDeleteFailure["cause"]) => CollectionDeleteFailure = (collectionName) => (cause) => ({ tag: 'CollectionDeleteFailure', cause, message: `Could not delete collection "${collectionName}"` })

export type CollectionListFailure = StashJSError<'CollectionListFailure', DecryptionFailure | GRPCError>
export const CollectionListFailure: (cause: CollectionListFailure["cause"]) => CollectionListFailure = (cause) => ({ tag: 'CollectionListFailure', cause })

export type DocumentDeleteFailure = StashJSError<'DocumentDeleteFailure', GRPCError | AuthenticationFailure>
export const DocumentDeleteFailure: (cause: DocumentDeleteFailure["cause"]) => DocumentDeleteFailure = (cause) => ({ tag: 'DocumentDeleteFailure', cause })

export type DocumentGetFailure = StashJSError<'DocumentGetFailure', DecryptionFailure | GRPCError | AuthenticationFailure>
export const DocumentGetFailure: (cause: DocumentGetFailure["cause"]) => DocumentGetFailure = (cause) => ({ tag: 'DocumentGetFailure', cause })

export type DocumentGetAllFailure = StashJSError<'DocumentGetAllFailure', DecryptionFailure | GRPCError | AuthenticationFailure>
export const DocumentGetAllFailure: (cause: DocumentGetAllFailure["cause"]) => DocumentGetAllFailure = (cause) => ({ tag: 'DocumentGetAllFailure', cause })

export type DocumentPutFailure = StashJSError<'DocumentPutFailure', EncryptionFailure | GRPCError | AuthenticationFailure>
export const DocumentPutFailure: (cause: DocumentPutFailure["cause"]) => DocumentPutFailure = (cause) => ({ tag: 'DocumentPutFailure', cause })

export type DocumentQueryFailure = StashJSError<'DocumentQueryFailure', DecryptionFailure | GRPCError | AuthenticationFailure>
export const DocumentQueryFailure: (cause: DocumentQueryFailure["cause"]) => DocumentQueryFailure = (cause) => ({ tag: 'DocumentQueryFailure', cause })


export type MissingConfigDir = StashJSError<'MissingConfigDir'>
export const MissingConfigDir: MissingConfigDir = ({ tag: 'MissingConfigDir' })

export type NoDefaultProfileSet = StashJSError<'NoDefaultProfileSet'>
export const NoDefaultProfileSet: NoDefaultProfileSet = ({ tag: 'NoDefaultProfileSet' })

export type MissingProfile = StashJSError<'MissingProfile'>
export const MissingProfile: (profileName: string) => MissingProfile = (profileName) => ({ tag: 'MissingProfile', message: `Missing or incomplete profile "${profileName}""` })

export type MalformedConfigFile = StashJSError<'MalformedConfigFile'>
export const MalformedConfigFile: (profileName: string) => MalformedConfigFile = (fileName) => ({ tag: 'MalformedConfigFile', message: `Could not parse config file "${fileName}"` })

export type IOError = StashJSError<'IOError', NativeError | PlainError >
export const IOError: (cause: IOError["cause"]) => IOError = (cause) => ({ tag: 'IOError', cause: wrap(cause) })

export type LoadProfileFailure = StashJSError<'LoadProfileFailure', MissingConfigDir | NoDefaultProfileSet | MissingProfile | MalformedConfigFile | IOError>
export const LoadProfileFailure: (cause: LoadProfileFailure["cause"]) => LoadProfileFailure = (cause) => ({ tag: 'LoadProfileFailure', cause })

export type DeleteProfileFailure = StashJSError<'DeleteProfileFailure', MissingConfigDir | MissingProfile | NoDefaultProfileSet | IOError>
export const DeleteProfileFailure: (cause: DeleteProfileFailure["cause"]) => DeleteProfileFailure = (cause) => ({ tag: 'DeleteProfileFailure', cause })

export type LoadProfileNamesFailure = StashJSError<'LoadProfileNamesFailure', MissingConfigDir | IOError>
export const LoadProfileNamesFailure: (cause: LoadProfileNamesFailure["cause"]) => LoadProfileNamesFailure = (cause) => ({ tag: 'LoadProfileNamesFailure', cause, message: "Could not load available profile names" })

export type SetDefaultProfileFailure = StashJSError<'SetDefaultProfileFailure', MissingConfigDir | MissingProfile | IOError>
export const SetDefaultProfileFailure: (cause: SetDefaultProfileFailure["cause"]) => SetDefaultProfileFailure = (cause) => ({ tag: 'SetDefaultProfileFailure', cause, message: "Could not set default profile" })

export type SaveProfileFailure = StashJSError<'SaveProfileFailure', SetDefaultProfileFailure | MissingConfigDir | IOError>
export const SaveProfileFailure: (cause: SaveProfileFailure["cause"]) => SaveProfileFailure = (cause) => ({ tag: 'SaveProfileFailure', cause })

export type OAuthFailure = StashJSError<'OAuthFailure', NativeError | PlainError>
export const OAuthFailure: (cause: OAuthFailure["cause"], message?: string) => OAuthFailure = (cause, message) => {
  if (typeof message === 'undefined') {
    return ({ tag: 'OAuthFailure', cause: wrap(cause) })
  } else {
    return ({ tag: 'OAuthFailure', message, cause: wrap(cause) })
  }
}

export type PlainError = StashJSError<'PlainError', undefined>
export const PlainError: (message: string) => PlainError = message => ({ tag: 'PlainError', message })

export type IllegalStateError = StashJSError<'IllegalStateError'>
export const IllegalStateError: (message: string) => IllegalStateError = (message) => ({ tag: 'IllegalStateError', message })

export type AuthenticationFailure = StashJSError<'AuthenticationFailure', OAuthFailure | AWSFederationFailure | SaveProfileFailure | IllegalStateError | KMSError>
export const AuthenticationFailure: (cause: AuthenticationFailure["cause"], message?: string) => AuthenticationFailure = (cause, message) => ({ tag: 'AuthenticationFailure', cause, message })

export type ConnectionFailure = StashJSError<'ConnectionFailure', LoadProfileFailure | AuthenticationFailure | KMSError>
export const ConnectionFailure: (cause: ConnectionFailure['cause']) => ConnectionFailure = (cause) => ({ tag: 'ConnectionFailure', cause })

export type KMSError = StashJSError<'KMSError', NativeError | PlainError >
export const KMSError: (cause: unknown, message?: string) => KMSError = (cause, message) => ({ tag: 'KMSError', cause: wrap(cause), message })

export type AWSFederationFailure = StashJSError<'AWSFederationFailure', NativeError | PlainError >
export const AWSFederationFailure: (cause: unknown, message?: string) => AWSFederationFailure = (cause, message) => ({ tag: 'AWSFederationFailure', cause: wrap(cause), message })

export type DecryptionFailure = StashJSError<'DecryptionFailure', NativeError | AuthenticationFailure>
export const DecryptionFailure: (cause: DecryptionFailure["cause"]) => DecryptionFailure = (cause) => ({ tag: 'DecryptionFailure', cause })

export type EncryptionFailure = StashJSError<'EncryptionFailure', NativeError | PlainError >
export const EncryptionFailure: (cause: unknown) => EncryptionFailure = (cause) => ({ tag: 'EncryptionFailure', cause: wrap(cause) })

export type StreamingPutFailure = StashJSError<'StreamingPutFailure', NativeError | GRPCError | AuthenticationFailure>
export const StreamingPutFailure: (cause: StreamingPutFailure["cause"]) => StreamingPutFailure = (cause) => ({ tag: 'StreamingPutFailure', cause })

// JS can throw and catch any type (not only Error and its sub-classes).  So we
// wrap it in a JS error if it wasn't actually an error otherwise we return the
// original error unmodified. The reason why we wrap in an error is to get a
// stack trace.
export const wrap
  : (thrown: unknown) => NativeError
  = (thrown) => {
    if (thrown instanceof Error) {
      return { tag: 'NativeError', cause: thrown }
    } else if ((thrown as any)?.tag === 'NativeError') {
      return thrown as any as NativeError
    } else {
      throw unreachable("If we get here then something is trying to wrap an error that is not an Error or NativeError")
    }
  }

  export function simpleDescriptionForError<Cause, E extends StashJSError<ErrorTag, Cause>>(error: E): string {
    switch (error.tag) {
      case 'AnalysisFailure': return "[AnalysisFailure] Analysis of a record failed"
      case 'AuthenticationFailure': return "[AuthenticationFailure] Authentication failed"
      case 'AWSFederationFailure': return "[AWSFederationFailure] Failed to federate credentials to AWS"
      case 'CollectionCreationFailure': return "[CollectionCreationFailure] Failed to create collection"
      case 'CollectionDeleteFailure': return "[CollectionDeleteFailure] Failed to delete collection"
      case 'CollectionLoadFailure': return "[CollectionLoadFailure] Failed to load collection"
      case 'CollectionListFailure': return "[CollectionListFailure] Failed to list collections"
      case 'ConnectionFailure': return "[ConnectionFailure] Failed to connect to StashJS service"
      case 'DecryptionFailure': return "[DecryptionFailure] Failed to decrypt"
      case 'DeleteProfileFailure': return "[DeleteProfileFailure] Failed to delete profile config or auth token"
      case 'DocumentDeleteFailure': return "[DocumentDeleteFailure] Failed to delete document from a collection"
      case 'DocumentGetFailure': return "[DocumentGetFailure] Failed to get document from collection"
      case 'DocumentGetAllFailure': return "[DocumentGetAllFailure] Failed to get all documents from collection"
      case 'DocumentPutFailure': return "[DocumentPutFailure] Failed to put document in collection"
      case 'DocumentQueryFailure': return "[DocumentQueryFailure] Failed to query documents"
      case 'EncryptionFailure': return "[EncryptionFailure] Failed to encrypt"
      case 'GRPCError': return "[GRPCError] GRPC Error"
      case 'IllegalStateError': return "[IllegalStateError] An internal error occurred: this is bug in StashJS"
      case 'IOError': return "[IOError] Error occurred reading or writing to the filesystem or the network"
      case 'KMSError': return "[KMSError] KMS error"
      case 'LoadProfileFailure': return "[LoadProfileFailure] Failed to load Stash profile"
      case 'LoadProfileNamesFailure': return "[LoadProfileNamesFailure] Failed to load Stash profile names"
      case 'MalformedConfigFile': return "[MalformedConfigFile] Stash profile was malformed"
      case 'MissingConfigDir': return "[MissingConfigDir] Stash config directory not found"
      case 'MissingProfile': return "[MissingProfile] Stash profile not found"
      case 'NoDefaultProfileSet': return "[NoDefaultProfileSet] No default Stash profile is set and StashJS was initiated without naming a specific profile"
      case 'OAuthFailure': return "[OAuthFailure] OAuth authentication failed"
      case 'PlainError': return error.message
      case 'NativeError': return `[JSError: ${(error.cause as any).name}]`
      case 'SaveProfileFailure': return "[SaveProfileFailure] Failed to save profile"
      case 'SetDefaultProfileFailure': return "[SetDefaultProfileFailure] Failed to set the default profile"
      case 'StreamingPutFailure': return "[StreamingPutFailure] Failure during streaming bulk upsert"
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


  export function toErrorMessage<Cause, E extends StashJSError<ErrorTag, Cause>>(error: E, indentation: number = 0): string {
    if (error.tag === 'PlainError') {
      return withIndentation(indentation, simpleDescriptionForErrorWithMessage(error))
    } if (error.tag === 'NativeError') {
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
      return `${Array.from(Array(indentation - 3).keys()).map(_ => " ").join("")} └ ${text}`
    }
  }

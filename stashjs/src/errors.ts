
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
  | 'NoDefaultProfileSet'
  | 'OAuthFailure'
  | 'SaveProfileFailure'
  | 'SetDefaultProfileFailure'
  | 'StreamingPutFailure'

export type JSError = InstanceType<ErrorConstructor>

export type NativeError = {
  tag: 'NativeError'
  cause: JSError
}

/**
 * A StashJSError is an error that is not backed by a native JavaScript error (or
 * one of its subclasses). It does not provide a stack trace.
 *
 * Instances of StashJSError will have a statically known list of causes which the
 * compiler can use to perform exhaustiveness checks should the handler of the
 * error want to alter behaviour based on the underlying cause.
 */
export type StashJSError<Tag extends ErrorTag, Cause = undefined> = {
  readonly tag: Tag
  readonly message?: string
  readonly cause?: Cause
}

export type GRPCError = StashJSError<'GRPCError', NativeError>
export const GRPCError: (cause: unknown) => GRPCError = (cause) => ({ tag: 'GRPCError', cause: wrap(cause) })

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

export type DocumentQueryFailure = StashJSError<'DocumentQueryFailure', EncryptionFailure | GRPCError | AuthenticationFailure>
export const DocumentQueryFailure: (cause: DocumentQueryFailure["cause"]) => DocumentQueryFailure = (cause) => ({ tag: 'DocumentQueryFailure', cause })


export type MissingConfigDir = StashJSError<'MissingConfigDir'>
export const MissingConfigDir: MissingConfigDir = ({ tag: 'MissingConfigDir' })

export type NoDefaultProfileSet = StashJSError<'NoDefaultProfileSet'>
export const NoDefaultProfileSet: NoDefaultProfileSet = ({ tag: 'NoDefaultProfileSet' })

export type MissingProfile = StashJSError<'MissingProfile'>
export const MissingProfile: (profileName: string) => MissingProfile = (profileName) => ({ tag: 'MissingProfile', message: `Missing or incomplete profile "${profileName}""` })

export type MalformedConfigFile = StashJSError<'MalformedConfigFile'>
export const MalformedConfigFile: (profileName: string) => MalformedConfigFile = (fileName) => ({ tag: 'MalformedConfigFile', message: `Could not parse config file "${fileName}"` })

export type IOError = StashJSError<'IOError', NativeError>
export const IOError: (cause: unknown) => IOError = (cause) => ({ tag: 'IOError', cause: wrap(cause) })

export type LoadProfileFailure = StashJSError<'LoadProfileFailure', MissingConfigDir | NoDefaultProfileSet | MissingProfile | MalformedConfigFile | IOError>
export const LoadProfileFailure: (cause: LoadProfileFailure["cause"]) => LoadProfileFailure = (cause) => ({ tag: 'LoadProfileFailure', cause })

export type LoadProfileNamesFailure = StashJSError<'LoadProfileNamesFailure', MissingConfigDir | IOError>
export const LoadProfileNamesFailure: (cause: LoadProfileNamesFailure["cause"]) => LoadProfileNamesFailure = (cause) => ({ tag: 'LoadProfileNamesFailure', cause, message: "Could not load available profile names" })

export type SetDefaultProfileFailure = StashJSError<'SetDefaultProfileFailure', MissingConfigDir | MissingProfile | IOError>
export const SetDefaultProfileFailure: (cause: SetDefaultProfileFailure["cause"]) => SetDefaultProfileFailure = (cause) => ({ tag: 'SetDefaultProfileFailure', cause, message: "Could not set default profile" })

export type SaveProfileFailure = StashJSError<'SaveProfileFailure', SetDefaultProfileFailure | MissingConfigDir | IOError>
export const SaveProfileFailure: (cause: SaveProfileFailure["cause"]) => SaveProfileFailure = (cause) => ({ tag: 'SaveProfileFailure', cause })

export type OAuthFailure = StashJSError<'OAuthFailure', NativeError>
export const OAuthFailure: (cause: unknown) => OAuthFailure = (cause) => {
  if (!!cause && (cause as any)['response']) {
    return ({ tag: 'OAuthFailure', cause: wrap((cause as any).response) })
  } else {
    return ({ tag: 'OAuthFailure', cause: wrap(cause) })
  }
}

export type IllegalStateError = StashJSError<'IllegalStateError'>
export const IllegalStateError: (message: string) => IllegalStateError = (message) => ({ tag: 'IllegalStateError', message })

export type AuthenticationFailure = StashJSError<'AuthenticationFailure', OAuthFailure | AWSFederationFailure | SaveProfileFailure | IllegalStateError>
export const AuthenticationFailure: (cause: AuthenticationFailure["cause"], message?: string) => AuthenticationFailure = (cause, message) => ({ tag: 'AuthenticationFailure', cause, message })

export type ConnectionFailure = StashJSError<'ConnectionFailure', LoadProfileFailure | AuthenticationFailure | KMSError>
export const ConnectionFailure: (cause: ConnectionFailure['cause']) => ConnectionFailure = (cause) => ({ tag: 'ConnectionFailure', cause })

export type KMSError = StashJSError<'KMSError', NativeError>
export const KMSError: (cause: unknown, message?: string) => KMSError = (cause, message) => ({ tag: 'KMSError', cause: wrap(cause), message })

export type AWSFederationFailure = StashJSError<'AWSFederationFailure', NativeError>
export const AWSFederationFailure: (cause: unknown, message?: string) => AWSFederationFailure = (cause, message) => ({ tag: 'AWSFederationFailure', cause: wrap(cause), message })

export type DecryptionFailure = StashJSError<'DecryptionFailure', NativeError>
export const DecryptionFailure: (cause: unknown) => DecryptionFailure = (cause) => ({ tag: 'DecryptionFailure', cause: wrap(cause) })

export type EncryptionFailure = StashJSError<'EncryptionFailure', NativeError>
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
      return { tag: 'NativeError', cause: new Error(`${thrown}`) }
    }
  }
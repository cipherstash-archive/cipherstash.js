import { AWSClientConfig } from '../aws'

export type AuthenticationDetails =
  {authToken: string, awsConfig: AWSClientConfig}

export type AuthenticationDetailsCallback<R> =
  (input: AuthenticationDetails) => Promise<R>

export interface AuthStrategy {
  /**
   * Initialise the strategy. This can be used to perform authentication without
   * having to wait for a request which will make the first call to
   * `authenticatedRequest` faster.
   *
   * This is also a good place to schedule a token expiry handler.
   */
  initialise(): Promise<void>

  /**
   * Executes a callback and provides the callback with authentication details.
   *
   * This can be used to wrap a request to a downstream service that requires
   * the credentials.
   *
   * If the authentication token has expired this method will refresh the token
   * before invoking the callback.
   *
   * Returns the result of the callback.
   *
   * If an authentication attempt fails, or an attempt to refresh the token
   * fails then the Promise will be rejected with an error.
   */
  withAuthentication<R>(callback: AuthenticationDetailsCallback<R>): Promise<R>

  /**
   * Returns true if the credentials managed by this AuthStrategy have not expired.
   * If there are multiple sets of credentials (i.e. Auth0 access token + federated
   * AWS credentials) then this must return false if *any* of them have expired.
   *
   * If the authentication state name is anything other than "authenticated" then this
   * method must return false.
   */
  isFresh(): boolean
}

/**
 * Use this function to obtain a Memo that will build a value of type T & cache
 * it. The value depends on having authentication credentials that have not
 * expired - when those credentials expire, the `freshValue` function will
 * trigger off a refresh of the authentication token.
 *
 * Use a Memo when you need to build an object that depends on having fresh,
 * unexpired credentials.
 *
 * A reference to the returned Memo object can be kept indefinitely.
 *
 * @param authStrategy - your AuthStrategy instance
 * @param builder - a function that when provided with up to date authentication
 *                  credentials will build a new value
 * @returns a Memo<T>
 */
export function withFreshCredentials<T>(authStrategy: AuthStrategy, builder: AuthenticationDetailsCallback<T>): Memo<T> {
  let latestValuePromise = authStrategy.withAuthentication(builder)
  return {
    async freshValue() {
      if (authStrategy.isFresh()) {
        return latestValuePromise
      } else {
        latestValuePromise = authStrategy.withAuthentication(builder)
        return latestValuePromise
      }
    }
  }
}

export interface Memo<T> {
  freshValue(): Promise<T>
}
import { AWSClientConfig } from '../aws'
import { AsyncResult, Err, Ok } from '../result'
import { AuthenticationFailure } from '../errors'

export type AuthenticationDetails = {
  authToken: string
  awsConfig: AWSClientConfig
}

export type MemoBuilder<R> = (input: AuthenticationDetails) => AsyncResult<R, AuthenticationFailure>

export interface AuthStrategy {
  /**
   * Initialise the strategy. This can be used to perform authentication without
   * having to wait for a request which will make the first call to
   * `authenticatedRequest` faster.
   *
   * This is also a good place to schedule a token expiry handler.
   */
  initialise(): AsyncResult<void, AuthenticationFailure>

  /**
   * Gets the authentication details from the strategy.
   *
   * If the strategy has not yet performed authentication, or the authentication
   * details have expired, it *must* attempt to re-authenticate before returning
   * the result.
   */
  getAuthenticationDetails(): AsyncResult<AuthenticationDetails, AuthenticationFailure>


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
export function withFreshCredentials<R>(authStrategy: AuthStrategy, builder: MemoBuilder<R>): Memo<R> {
  let value: R

  return {
    async freshValue() {
      if (value && authStrategy.isFresh()) {
        return Ok(value)
      } else {
        const authDetails = await authStrategy.getAuthenticationDetails()
        if (authDetails.ok) {
          const result = await builder(authDetails.value)
          if (result.ok) {
            value = result.value
            return Ok(value)
          } else {
            return Err(result.error)
          }
        } else {
          return Err(authDetails.error)
        }
      }
    }
  }
}

export interface Memo<R> {
  freshValue(): AsyncResult<R, AuthenticationFailure>
}
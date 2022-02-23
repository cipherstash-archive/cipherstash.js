import { AsyncResult, Err, Ok } from '../result'
import { AuthenticationFailure } from '../errors'

export type MemoBuilder<A, R> = (input: A) => AsyncResult<R, AuthenticationFailure>

export interface AuthStrategy<A> {
  /**
   * Indicate whether the credentials are still "fresh", that is, unexpired
   * according to the validity period indicated when the token was initially
   * acquired.
   *
   * Note that no actual validation of the token with the IdP is performed,
   * so performance is good, but if the token can be revoked, authenticated
   * operations may still fail.
   */
  stillFresh(): boolean

  /**
   * Gets the authentication details from the strategy.
   *
   * If the strategy has not yet performed authentication, or the authentication
   * details have expired, it *must* attempt to re-authenticate before returning
   * the result.
   */
  getAuthenticationDetails(): AsyncResult<A, AuthenticationFailure>
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
export function withFreshCredentials<A, R>(builder: MemoBuilder<A, R>, authStrategy: AuthStrategy<A>): Memo<R> {
  let value: R

  return {
    async freshValue(): AsyncResult<R, AuthenticationFailure> {
      if (value && authStrategy.stillFresh()) {
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

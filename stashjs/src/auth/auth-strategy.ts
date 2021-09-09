import { AWSCredentials } from "./aws-credentials";

export type AuthenticationDetailsCallback<R> =
  (authToken: string, awsCredentials: AWSCredentials) => Promise<R>

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
   * Wraps a request to a downstream service with authentication.
   *
   * The callback will be invoked in which * the call to the downstream service
   * can be made with the token.
   *
   * If a cached token has expired a token refresh will be performed before
   * execution of the callback.
   *
   * Returns the result of the callback.
   *
   * If an authentication attempt fails, or an attempt to refresh the token
   * fails then the Promise will be rejected with an error.
   */
  authenticatedRequest<R>(callback: AuthenticationDetailsCallback<R>): Promise<R>
}
import { AuthenticationInfo } from './oauth-utils'

export type AuthenticationState =
  | { name: "unauthenticated" }
  | { name: "authentication-failed", error?: string }
  | { name: "authentication-expired", authInfo: AuthenticationInfo }
  | { name: "authenticated", authInfo: AuthenticationInfo }
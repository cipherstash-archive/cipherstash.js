import { AwsCredentials } from './aws-credentials'
import { OauthAuthenticationInfo } from './oauth-utils'

export type AuthenticationState =
  | { readonly name: "unauthenticated" }
  | { readonly name: "authentication-failed", readonly error?: string }
  | { readonly name: "authentication-expired", readonly oauthInfo: OauthAuthenticationInfo }
  | { readonly name: "authenticated", readonly oauthInfo: OauthAuthenticationInfo, readonly awsCredentials: AwsCredentials }
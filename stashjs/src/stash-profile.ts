import { StashConfiguration } from "./stash-config";
import { OauthAuthenticationInfo } from "./auth/oauth-utils";

/**
 * A StashProfile consists of configuration + credentials, which is all of the
 * information required to establish a Stash connection.
 */
export type StashProfile = {
  /**
   * The name of the profile. This is the directory name where the profile will be stored `$HOME/.cipherstash/<name>`.
   */
  readonly name: string

  /**
   * The configuration for this StashProfile
   */
  readonly config: StashConfiguration

  /**
   * The auth token for this StashProfile
   * TODO: this will not be present for a M2M login.
   * TODO: We should create a new type for M2M logins to avoid having an optional type
   */
  readonly oauthCreds?: OauthAuthenticationInfo
}

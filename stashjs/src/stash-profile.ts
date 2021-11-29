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
  readonly config: StashConfiguration
  readonly creds: OauthAuthenticationInfo
}
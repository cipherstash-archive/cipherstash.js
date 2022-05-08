import { OauthAuthenticationInfo, stashOauth } from "./oauth-utils"
import { AuthStrategy } from "./auth-strategy"
import { ConsoleAccessKey, StashConfiguration } from "../stash-config"
import { AuthenticationFailure } from "../errors"
import { AsyncResult, Err, Ok } from "../result"

export type StashProfileConsoleAccessKey = {
  config: Omit<StashConfiguration, "identityProvider"> & {
    identityProvider: ConsoleAccessKey
  }
}

export class ConsoleAccessKeyStrategy implements AuthStrategy<OauthAuthenticationInfo> {
  private oauthCreds: OauthAuthenticationInfo = {
    accessToken: "",
    refreshToken: "",
    expiry: 0,
  }

  constructor(private profile: StashProfileConsoleAccessKey) {}

  public stillFresh(): boolean {
    return !this.needsRefresh()
  }

  public async getAuthenticationDetails(): AsyncResult<OauthAuthenticationInfo, AuthenticationFailure> {
    if (this.needsRefresh()) {
      const tokenResult = await this.acquireAccessToken()
      if (!tokenResult.ok) {
        return Err(tokenResult.error)
      }
    }

    return Ok(this.oauthCreds)
  }

  private needsRefresh(): boolean {
    return Date.now() / 1000 - EXPIRY_BUFFER_SECONDS > this.oauthCreds.expiry
  }

  private async acquireAccessToken(): AsyncResult<void, AuthenticationFailure> {
    const oauthInfo = await stashOauth.authenticateViaConsoleAccessKey(this.profile.config.identityProvider.accessKey)

    if (oauthInfo.ok) {
      this.oauthCreds = oauthInfo.value
      return Ok()
    } else {
      return Err(oauthInfo.error)
    }
  }
}

/* Refresh tokens before the expiry to avoid API errors due
 * to race conditions. Expiry buffer is in seconds */
const EXPIRY_BUFFER_SECONDS = 20

import { OauthAuthenticationInfo } from "./oauth-utils"
import { AuthStrategy } from "./auth-strategy"
import { OAuthCallback, StashConfiguration } from "../stash-config"
import { AuthenticationFailure, OAuthFailure, PlainError } from "../errors"
import { AsyncResult, Err, Ok } from "../result"

/* Refresh tokens before the expiry to avoid API errors due
 * to race conditions. Expiry buffer is in seconds */
const EXPIRY_BUFFER_SECONDS = 120

export type StashProfileOAuthCallback = {
  config: Omit<StashConfiguration, "identityProvider"> & {
    identityProvider: OAuthCallback
  }
}

export class OAuthCallbackStrategy implements AuthStrategy<OauthAuthenticationInfo> {
  private expiry = 0
  private callback: () => AsyncResult<OauthAuthenticationInfo, AuthenticationFailure>
  private creds: OauthAuthenticationInfo = { accessToken: "", refreshToken: "", expiry: 0 }

  constructor(profile: StashProfileOAuthCallback) {
    this.callback = profile.config.identityProvider.callback
  }

  public stillFresh(): boolean {
    return !this.needsRefresh()
  }

  public async getAuthenticationDetails(): AsyncResult<OauthAuthenticationInfo, AuthenticationFailure> {
    if (this.needsRefresh()) {
      const credsResult = await this.callback()
      if (!credsResult.ok)
        return Err(
          AuthenticationFailure(OAuthFailure(PlainError(`Error returned on oauth callback ${credsResult.error}`)))
        )
      this.expiry = credsResult.value.expiry
      this.creds = credsResult.value
    }

    return Ok(this.creds)
  }

  private needsRefresh(): boolean {
    return Date.now() / 1000 - EXPIRY_BUFFER_SECONDS > this.expiry
  }
}

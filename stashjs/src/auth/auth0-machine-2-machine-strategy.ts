import { OauthAuthenticationInfo, stashOauth } from './oauth-utils'
import { AuthStrategy } from './auth-strategy'
import { Auth0Machine2Machine, StashConfiguration } from '../stash-config'
import { AuthenticationFailure } from '../errors'
import { AsyncResult, Err, Ok } from '../result'

export type StashProfileAuth0Machine2Machine = {
  config: Omit<StashConfiguration, 'identityProvider'> & { identityProvider: Auth0Machine2Machine }
}

export class Auth0Machine2MachineStrategy implements AuthStrategy<OauthAuthenticationInfo> {
  private oauthCreds: OauthAuthenticationInfo = { accessToken: "", refreshToken: "", expiry: 0 }

  constructor(private profile: StashProfileAuth0Machine2Machine) {}

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
    return (Date.now() / 1000 - EXPIRY_BUFFER_SECONDS) > this.oauthCreds.expiry
  }

  private async acquireAccessToken(): AsyncResult<void, AuthenticationFailure> {
    const oauthInfo = await stashOauth.authenticateViaClientCredentials(
      this.profile.config.identityProvider.host,
      this.profile.config.service.host,
      this.profile.config.identityProvider.clientId,
      this.profile.config.identityProvider.clientSecret
    )

    if (oauthInfo.ok) {
      this.oauthCreds = oauthInfo.value
      return Ok(void 0)
    } else {
      return Err(oauthInfo.error)
    }
  }
 }

/* Refresh tokens before the expiry to avoid API errors due
 * to race conditions. Expiry buffer is in seconds */
const EXPIRY_BUFFER_SECONDS = 20

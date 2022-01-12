import { AuthenticationDetails, AuthStrategy } from "./auth-strategy"
import { AuthenticationState } from './authentication-state'
import { stashOauth, OauthAuthenticationInfo } from './oauth-utils'
import { profileStore } from './profile-store'
import { Auth0DeviceCode, StashConfiguration } from "../stash-config"
import { awsConfig } from "../aws";
import { StashProfile } from "../stash-profile";
import * as open from 'open'
import { AsyncResult, Ok, Err } from "../result"
import { AuthenticationFailure, IllegalStateError, OAuthFailure } from "../errors"

export type StashProfileAuth0DeviceCode  = StashProfile & {
  config: Omit<StashConfiguration, 'identityProvider'> & { identityProvider: Auth0DeviceCode },
  oauthCreds: OauthAuthenticationInfo
}

export class Auth0DeviceCodeStrategy implements AuthStrategy {
  private state: AuthenticationState = { name: "unauthenticated" }

  constructor(private profile: StashProfileAuth0DeviceCode) { }

  public async initialise(): AsyncResult<void, AuthenticationFailure> {
    this.scheduleTokenRefresh()
    if (!this.isExpired(this.profile.oauthCreds.expiry)) {
      const awsConfigDetails = await awsConfig(this.profile.config.keyManagement.awsCredentials, this.profile.oauthCreds.accessToken)
      if (awsConfigDetails.ok) {
        this.state = {
          name: "authenticated",
          oauthInfo: this.profile.oauthCreds,
          awsConfig: awsConfigDetails.value
        }
        return Ok(void 0)
      } else {
        return Err(AuthenticationFailure(awsConfigDetails.error))
      }
    } else {
      // Try to perform an immediate refresh
      const refreshResult = await this.performTokenRefreshAndUpdateState(this.profile.oauthCreds.refreshToken)
      if (refreshResult.ok) {
        return Ok(void 0)
      } else {
        const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
          this.profile.config.identityProvider.host,
          this.profile.config.identityProvider.clientId,
          this.profile.config.service.host,
          this.profile.config.service.workspace
        )

        if (pollingInfo.ok) {
          if (!isInteractive()) {
            open.default(pollingInfo.value.verificationUri)
          }

          const authInfo = await stashOauth.pollForDeviceCodeAcceptance(
            this.profile.config.identityProvider.host,
            this.profile.config.identityProvider.clientId,
            pollingInfo.value.deviceCode,
            pollingInfo.value.interval
          )

          if (authInfo.ok) {
            const saved = await profileStore.saveProfile({ ...this.profile, oauthCreds: authInfo.value })
            if (saved.ok) {
              return Ok(void 0)
            } else {
              return Err(AuthenticationFailure(saved.error))
            }
          } else {
            return Err(authInfo.error)
          }
        } else {
          return Err(refreshResult.error)
        }
      }
    }
  }

  public async getAuthenticationDetails(): AsyncResult<AuthenticationDetails, AuthenticationFailure> {
    if (this.state.name === "authenticated") {
      return Ok({
        authToken: this.state.oauthInfo.accessToken,
        awsConfig: this.state.awsConfig
      })
    } else {
      return Err(AuthenticationFailure(IllegalStateError("Authentication details were requested but StashJS is not currently authenticated")))
    }
  }

  public isFresh(): boolean {
    if (this.state.name !== "authenticated") {
      return false
    }

    const now = (new Date()).getTime()

    const awsConfigExpiration = this.state.awsConfig.credentials!.expiration
    // If we don't have an expiration it means we are not federating and the creds do not expire.
    const awsCredsAreFresh = !awsConfigExpiration || awsConfigExpiration.getTime() > now
    const auth0CredsAreFresh = this.state.oauthInfo.expiry > now

    return awsCredsAreFresh && auth0CredsAreFresh
  }

  private isExpired(expiresAt: number): boolean {
    return (Date.now() - (EXPIRY_BUFFER_SECONDS * 1000)) > (expiresAt * 1000)
  }

  private async scheduleTokenRefresh(): AsyncResult<void, never> {
    if (this.state.name === "authenticated") {
      const { refreshToken, expiry } = this.state.oauthInfo
      const timeout = setTimeout(async () => {
        await this.performTokenRefreshAndUpdateState(refreshToken)
        this.scheduleTokenRefresh()
      }, (expiry * 1000) - (EXPIRY_BUFFER_SECONDS * 1000) - Date.now())
      timeout.unref()
    } else if (this.state.name === "authentication-expired") {
      const { refreshToken } = this.state.oauthInfo
      await this.performTokenRefreshAndUpdateState(refreshToken)
      this.scheduleTokenRefresh()
    }
    return Ok(void 0)
  }

  private async performTokenRefreshAndUpdateState(refreshToken: string): AsyncResult<void, AuthenticationFailure> {
    const { host, clientId } = this.profile.config.identityProvider

    const oauthInfo = await stashOauth.performTokenRefresh(host, refreshToken, clientId)
    if (oauthInfo.ok) {
      const saved = await profileStore.saveProfile({ ...this.profile, oauthCreds: oauthInfo.value })
      if (saved.ok) {
        const awsConfigDetails = await awsConfig(this.profile.config.keyManagement.awsCredentials, oauthInfo.value.accessToken)
        if (awsConfigDetails.ok) {
          this.state = {
            name: "authenticated",
            oauthInfo: oauthInfo.value,
            awsConfig: awsConfigDetails.value
          }
          return Ok(void 0)
        } else {
          return Err(AuthenticationFailure(awsConfigDetails.error))
        }
      } else {
        return Err(AuthenticationFailure(saved.error))
      }
    } else {
      return Err(AuthenticationFailure(OAuthFailure(oauthInfo.error)))
    }
  }
}

const EXPIRY_BUFFER_SECONDS = 20

function isInteractive(): boolean {
  return (
    process.env['SSH_CLIENT'] !== undefined ||
    process.env['SSH_TTY'] !== undefined
  )
}
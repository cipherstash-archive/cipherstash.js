import { AuthenticationDetailsCallback, AuthStrategy } from "./auth-strategy"
import { AuthenticationState } from './authentication-state'
import { stashOauth, OauthAuthenticationInfo } from './oauth-utils'
import { describeError } from "../utils"
import { profileStore } from './profile-store'
import { Auth0DeviceCode, StashConfiguration } from "../stash-config"
import { awsConfig } from "../aws";
import { StashProfile } from "../stash-profile";
import * as open from 'open'

export type StashProfileAuth0DeviceCode  = StashProfile & {
  config: Omit<StashConfiguration, 'identityProvider'> & { identityProvider: Auth0DeviceCode },
  oauthCreds: OauthAuthenticationInfo
}

export class Auth0DeviceCodeStrategy implements AuthStrategy {
  private state: AuthenticationState = { name: "unauthenticated" }

  constructor(private profile: StashProfileAuth0DeviceCode) { }

  public async initialise(): Promise<void> {
    try {
      if (!this.isExpired(this.profile.oauthCreds.expiry)) {
        this.state = {
          name: "authenticated",
          oauthInfo: this.profile.oauthCreds,
          awsConfig: await awsConfig(this.profile.config.keyManagement.awsCredentials, this.profile.oauthCreds.accessToken)
        }
      } else {
        try {
          // Try to perform an immediate refresh
          await this.performTokenRefreshAndUpdateState(this.profile.oauthCreds.refreshToken)
        } catch (err) {
          // If the refresh has failed, try to start over with device code auth
          const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
            this.profile.config.identityProvider.host,
            this.profile.config.identityProvider.clientId,
            this.profile.config.service.host,
            this.profile.config.service.workspace
          )

          if (!isInteractive()) {
            open.default(pollingInfo.verificationUri)
          }

          const authInfo = await stashOauth.pollForDeviceCodeAcceptance(
            this.profile.config.identityProvider.host,
            this.profile.config.identityProvider.clientId,
            pollingInfo.deviceCode,
            pollingInfo.interval
          )

          await profileStore.saveProfile({ ...this.profile, oauthCreds: authInfo })
        }
      }
      this.scheduleTokenRefresh()
    } catch (err) {
      return Promise.reject(err)
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

  public async withAuthentication<R>(callback: AuthenticationDetailsCallback<R>): Promise<R> {
    if (this.state.name == "authenticated") {
      try {
        return await callback({authToken: this.state.oauthInfo.accessToken, awsConfig: this.state.awsConfig})
      } catch (err) {
        return Promise.reject(`API call failed: ${describeError(err)}`)
      }
    } else {
      return Promise.reject("Not authenticated")
    }
  }

  private isExpired(expiresAt: number): boolean {
    return (Date.now() - (EXPIRY_BUFFER_SECONDS * 1000)) > (expiresAt * 1000)
  }

  private async scheduleTokenRefresh(): Promise<void> {
    if (this.state.name == "authenticated") {
      const { refreshToken, expiry } = this.state.oauthInfo
      const timeout = setTimeout(async () => {
        try {
          await this.performTokenRefreshAndUpdateState(refreshToken)
        } finally {
          this.scheduleTokenRefresh()
        }
      }, (expiry * 1000) - (EXPIRY_BUFFER_SECONDS * 1000) - Date.now())
      timeout.unref()
    } else if (this.state.name == "authentication-expired") {
      const { refreshToken } = this.state.oauthInfo
      try {
        await this.performTokenRefreshAndUpdateState(refreshToken)
      } finally {
        this.scheduleTokenRefresh()
      }
    }
  }

  private async performTokenRefreshAndUpdateState(refreshToken: string): Promise<void> {
    try {
      const idpHost = this.profile.config.identityProvider.host
      const clientId = this.profile.config.identityProvider.clientId
      const oauthInfo = await stashOauth.performTokenRefresh(idpHost, refreshToken, clientId)
      await profileStore.saveProfile({ ...this.profile, oauthCreds: oauthInfo })

      this.state = {
        name: "authenticated",
        oauthInfo,
        awsConfig: await awsConfig(this.profile.config.keyManagement.awsCredentials, oauthInfo.accessToken)
      }
      return Promise.resolve()
    } catch (err) {
      this.state = {
        name: "authentication-failed",
        error: describeError(err)
      }
      return Promise.reject()
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
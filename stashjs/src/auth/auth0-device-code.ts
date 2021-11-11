import { AuthenticationDetailsCallback, AuthStrategy } from "./auth-strategy";
import { AuthenticationState } from './authentication-state'
import { OauthAuthenticationInfo, stashOauth } from './oauth-utils'
import { describeError } from "../utils"
import { configStore } from './config-store'
import { Auth0DeviceCode as Auth0DeviceCodeType, StashProfile } from "../stash-profile";
import { awsConfig } from "../aws";


export class Auth0DeviceCode implements AuthStrategy {
  private state: AuthenticationState = { name: "unauthenticated" }
  private idp: Auth0DeviceCodeType

  constructor(
    private profile: StashProfile,
    private authInfo: OauthAuthenticationInfo
    ) {
    if (profile.identityProvider.kind !== "Auth0-DeviceCode") {
      throw `Invalid identityProvider in profile passed Auth0DeviceCode (expected 'Auth0-DeviceCode', got '${profile.identityProvider.kind}')`
    }
    this.idp = profile.identityProvider
  }

  public async initialise(): Promise<void> {
    try {
      if (!this.isExpired(this.authInfo.expiry)) {
        this.state = {
          name: "authenticated",
          oauthInfo: {
            accessToken: this.authInfo.accessToken,
            refreshToken: this.authInfo.refreshToken,
            expiry: this.authInfo.expiry
          },
          awsConfig: await awsConfig(this.profile.keyManagement.awsCredentials, this.authInfo.accessToken)
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
      const idpHost = this.idp.host
      const clientId = this.idp.clientId
      const oauthInfo = await stashOauth.performTokenRefresh(idpHost, refreshToken, clientId)
      await configStore.saveProfileAuthInfo(this.profile.service.workspace, oauthInfo)

      this.state = {
        name: "authenticated",
        oauthInfo,
        awsConfig: await awsConfig(this.profile.keyManagement.awsCredentials, oauthInfo.accessToken)
      }
    } catch (err) {
      this.state = {
        name: "authentication-failed",
        error: describeError(err)
      }
    }
  }
}

const EXPIRY_BUFFER_SECONDS = 20

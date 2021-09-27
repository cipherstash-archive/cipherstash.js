import { AuthenticationDetailsCallback, AuthStrategy } from "./auth-strategy";
import { AuthenticationState } from './authentication-state'
import { federateToken } from "./federation-utils"
import { stashOauth } from './oauth-utils'
import { FederationConfig } from "../stash-config"
import { describeError } from "../utils"
import { tokenStore } from './token-store'

export class ViaStoredToken implements AuthStrategy {
  private state: AuthenticationState = { name: "unauthenticated"}

  constructor(
    private clientId: string,
    private idpHost: string,
    private federationConfig: FederationConfig
  ) { }

  public async initialise(): Promise<void> {
    try {
      const config = await tokenStore.load()
      if (!this.isExpired(config.expiry)) {
        this.state = {
          name: "authenticated",
          oauthInfo: {
            accessToken: config.accessToken,
            refreshToken: config.refreshToken,
            expiry: config.expiry
          },
          awsCredentials: await federateToken(config.accessToken, this.federationConfig)
        }
      } else {
        this.state = {
          name: "authentication-expired",
          oauthInfo: {
            accessToken: config.accessToken,
            refreshToken: config.refreshToken,
            expiry: config.expiry
          },
        }
      }
      this.scheduleTokenRefresh()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  public async authenticatedRequest<R>(callback: AuthenticationDetailsCallback<R>): Promise<R> {
    if (this.state.name == "authenticated") {
      try {
        return await callback(this.state.oauthInfo.accessToken, this.state.awsCredentials)
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
      const oauthInfo = await stashOauth.performTokenRefresh(this.idpHost, refreshToken, this.clientId)
      await tokenStore.save(oauthInfo)
      const awsCredentials = await federateToken(oauthInfo.accessToken, this.federationConfig)
      this.state ={
        name: "authenticated",
        oauthInfo,
        awsCredentials
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

import { AuthStrategy } from "./auth-strategy";
import { AuthenticationState } from './authentication-state'
import { federateToken } from "./federation-utils"
import { AuthenticationInfo, stashOauth } from './oauth-utils'
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
      this.state = {
        name: this.isExpired(config.expiry) ? "authentication-expired" : "authenticated",
        authInfo: {
          accessToken: config.accessToken,
          refreshToken: config.refreshToken,
          expiry: config.expiry
        }
      }
      if (this.state.name == "authenticated") {
        await federateToken(this.idpHost, this.federationConfig, this.state.authInfo.accessToken)
      }
      this.scheduleTokenRefresh()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  public async authenticatedRequest<R>(callback: (authToken: string) => Promise<R>): Promise<R> {
    if (this.state.name == "authenticated") {
      try {
        return await callback(this.state.authInfo.accessToken)
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
      const { refreshToken, expiry } = this.state.authInfo
      const timeout = setTimeout(async () => {
        try {
          await this.performTokenRefreshAndUpdateState(refreshToken)
        } finally {
          this.scheduleTokenRefresh()
        }
      }, (expiry * 1000) - (EXPIRY_BUFFER_SECONDS * 1000) - Date.now())
      timeout.unref()
    } else if (this.state.name == "authentication-expired") {
      const { refreshToken } = this.state.authInfo
      try {
        await this.performTokenRefreshAndUpdateState(refreshToken)
      } finally {
        this.scheduleTokenRefresh()
      }
    }
  }

  private async performTokenRefreshAndUpdateState(refreshToken: string): Promise<void> {
    try {
      const response = await stashOauth.performTokenRefresh(this.idpHost, refreshToken, this.clientId)
      this.updateStateFromTokenAuthenticationResponse(response)
      if (this.state.name == "authenticated") {
        await tokenStore.save(this.state.authInfo)
        await federateToken(this.idpHost, this.federationConfig, this.state.authInfo.accessToken)
      }
    } catch (err) {
      this.state = {
        name: "authentication-failed",
        error: describeError(err)
      }
    }
  }

  private updateStateFromTokenAuthenticationResponse(authInfo: AuthenticationInfo): void {
    this.state = {
      name: "authenticated",
      authInfo
    }
  }
}

const EXPIRY_BUFFER_SECONDS = 20
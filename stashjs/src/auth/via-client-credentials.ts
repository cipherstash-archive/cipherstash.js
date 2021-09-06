import { AuthenticationInfo, stashOauth } from './oauth-utils'
import { AuthenticationState } from './authentication-state'
import { AuthStrategy } from './auth-strategy'
import { federateToken } from './federation-utils'
import { FederationConfig } from '../stash-config'
import { describeError } from '..'

export class ViaClientCredentials implements AuthStrategy {
  private state: AuthenticationState = { name: "unauthenticated" }

  constructor(
    private idpHost: string,
    private clientCredentials: ClientCredentials,
    private dataServiceId: string,
    private federationConfig: FederationConfig
  ) {}

  public async initialise(): Promise<void> {
    await this.authenticate()
    this.scheduleTokenRefresh()
  }

  public async authenticatedRequest<R>(callback: (authToken: string) => Promise<R>): Promise<R> {
    if (this.state.name != "authenticated") {
      await this.authenticate()
    }

    if (this.state.name == "authenticated") {
      try {
        return await callback(this.state.authInfo.accessToken)
      } catch (err) {
        return Promise.reject(`API call failed: ${describeError(err)}`)
      }
    } else if (this.state.name == "authentication-failed") {
      return Promise.reject(`Authentication failure: ${this.state.error}`)
    } else {
      return Promise.reject("Internal error: unreachable state")
    }
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
      const response = await stashOauth.performTokenRefresh(this.idpHost, refreshToken, this.clientCredentials.clientId)
      this.updateStateFromTokenAuthenticationResponse(response)
      if (this.state.name == "authenticated") {
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

  private async authenticate(): Promise<void> {
    try {
      const authInfo = await stashOauth.authenticateViaClientCredentials(
        this.idpHost,
        this.dataServiceId,
        this.clientCredentials.clientId,
        this.clientCredentials.clientSecret
      )
      await federateToken(this.idpHost, this.federationConfig, authInfo.accessToken)
      this.state = { name: "authenticated", authInfo }
    } catch (error) {
      this.state = { name: "authentication-failed", error: describeError(error) }
    }
  }
}

/* Refresh tokens before the expiry to avoid API errors due
 * to race conditions. Expiry buffer is in seconds */
const EXPIRY_BUFFER_SECONDS = 20

export type ClientCredentials = {
  clientId: string,
  clientSecret: string
}
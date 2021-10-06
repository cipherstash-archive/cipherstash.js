import { stashOauth } from './oauth-utils'
import { AuthenticationState } from './authentication-state'
import { AuthenticationDetailsCallback, AuthStrategy } from './auth-strategy'
import { federateToken } from './federation-utils'
import { FederationConfig } from '../stash-config'
import { describeError } from '..'

export class ViaClientCredentials implements AuthStrategy {
  private state: AuthenticationState = { name: "unauthenticated" }

  constructor(
    private idpHost: string,
    private clientCredentials: ClientCredentials,
    private dataServiceId: string,
    private federationConfig?: FederationConfig
  ) {}

  public async initialise(): Promise<void> {
    await this.authenticate()
    this.scheduleTokenRefresh()
  }

  public async authenticatedRequest<R>(callback: AuthenticationDetailsCallback<R>): Promise<R> {
    if (this.state.name != "authenticated") {
      await this.authenticate()
    }

    if (this.state.name == "authenticated") {
      try {
        return await callback(this.state.oauthInfo.accessToken, this.state.awsCredentials)
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
      const oauthInfo = await stashOauth.performTokenRefresh(this.idpHost, refreshToken, this.clientCredentials.clientId)
      if (this.state.name == "authenticated") {
        this.state = {
          name: "authenticated",
          oauthInfo,
          awsCredentials: this.federationConfig ? await federateToken(oauthInfo.accessToken, this.federationConfig) : undefined
        }
      }
    } catch (err) {
      this.state = {
        name: "authentication-failed",
        error: describeError(err)
      }
    }
  }

  private async authenticate(): Promise<void> {
    try {
      const oauthInfo = await stashOauth.authenticateViaClientCredentials(
        this.idpHost,
        this.dataServiceId,
        this.clientCredentials.clientId,
        this.clientCredentials.clientSecret
      )
      try {
        const awsCredentials = this.federationConfig ? await federateToken(oauthInfo.accessToken, this.federationConfig) : undefined
        this.state = {
          name: "authenticated",
          oauthInfo,
          awsCredentials
        }
      } catch (error) {
        this.state = { name: "authentication-failed", error: `Token federation failure: ${describeError(error)}` }
      }
    } catch (error) {
      this.state = { name: "authentication-failed", error: `Oauth failure: ${describeError(error)}` }
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

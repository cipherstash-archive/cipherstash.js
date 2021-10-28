import { stashOauth } from './oauth-utils'
import { AuthenticationState } from './authentication-state'
import { AuthenticationDetailsCallback, AuthStrategy } from './auth-strategy'
import { federateToken } from './federation-utils'
import { StashConfig } from '../stash-config'
import { describeError } from '../utils'

export class ViaClientCredentials implements AuthStrategy {
  private state: AuthenticationState = { name: "unauthenticated" }

  constructor(private config: StashConfig) { }

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
      const oauthInfo = await stashOauth.performTokenRefresh(
        this.config.identityProvider.host,
        refreshToken,
        this.config.identityProvider.clientId
      )

      if (this.state.name == "authenticated") {
        this.state = {
          name: "authenticated",
          oauthInfo,
          awsCredentials: this.config.keyManagement.awsCredentials.kind === "Federated"
            ? await federateToken(oauthInfo.accessToken, this.config.keyManagement.awsCredentials)
            : {
              accessKeyId: this.config.keyManagement.awsCredentials.accessKeyId,
              secretAccessKey: this.config.keyManagement.awsCredentials.accessKeyId
            }
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
    if (this.config.identityProvider.kind !== "Auth0-Machine2Machine") {
      throw new Error("Expected 'identityProvider.kind' to be 'Auth0-Machine2Machine'")
    }
    try {
      const oauthInfo = await stashOauth.authenticateViaClientCredentials(
        this.config.identityProvider.host,
        this.config.serviceFqdn,
        this.config.identityProvider.clientId,
        this.config.identityProvider.clientSecret
      )
      try {
        const awsCredentials = this.config.keyManagement.awsCredentials.kind === "Federated"
          ? await federateToken(oauthInfo.accessToken, this.config.keyManagement.awsCredentials)
          : {
            accessKeyId: this.config.keyManagement.awsCredentials.accessKeyId,
            secretAccessKey: this.config.keyManagement.awsCredentials.accessKeyId
          }


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

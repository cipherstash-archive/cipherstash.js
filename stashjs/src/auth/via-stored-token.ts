import { AuthenticationDetailsCallback, AuthStrategy } from "./auth-strategy";
import { AuthenticationState } from './authentication-state'
import { federateToken } from "./federation-utils"
import { stashOauth } from './oauth-utils'
import { describeError } from "../utils"
import { configStore, WorkspaceConfigAndAuthInfo } from './config-store'


export class ViaStoredToken implements AuthStrategy {
  private state: AuthenticationState = { name: "unauthenticated"}

  constructor(private config: WorkspaceConfigAndAuthInfo) {}

  public async initialise(): Promise<void> {
    const config = this.config.workspaceConfig
    try {
      if (!this.isExpired(this.config.authInfo.expiry)) {
        this.state = {
          name: "authenticated",
          oauthInfo: {
            accessToken: this.config.authInfo.accessToken,
            refreshToken: this.config.authInfo.refreshToken,
            expiry: this.config.authInfo.expiry
          },
          awsCredentials: config.keyManagement.awsCredentials.kind === "Federated"
            ? await federateToken(this.config.authInfo.accessToken, config.keyManagement.awsCredentials)
            : {
              accessKeyId: config.keyManagement.awsCredentials.accessKeyId,
              secretAccessKey: config.keyManagement.awsCredentials.accessKeyId
            }

        }
      } else {
        this.state = {
          name: "authentication-expired",
          oauthInfo: {
            accessToken: this.config.authInfo.accessToken,
            refreshToken: this.config.authInfo.refreshToken,
            expiry: this.config.authInfo.expiry
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
      const config = this.config.workspaceConfig
      const idpHost = config.identityProvider.host
      const clientId = config.identityProvider.clientId
      const oauthInfo = await stashOauth.performTokenRefresh(idpHost, refreshToken, clientId)
      await configStore.saveWorkspaceAuthInfo(this.config.workspaceId, oauthInfo)
      const awsCredentials = config.keyManagement.awsCredentials.kind === "Federated"
        ? await federateToken(this.config.authInfo.accessToken, config.keyManagement.awsCredentials)
        : {
          accessKeyId: config.keyManagement.awsCredentials.accessKeyId,
          secretAccessKey: config.keyManagement.awsCredentials.accessKeyId
        }

      this.state = {
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

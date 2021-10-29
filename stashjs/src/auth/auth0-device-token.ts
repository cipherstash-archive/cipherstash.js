import { AuthenticationDetailsCallback, AuthStrategy } from "./auth-strategy";
import { AuthenticationState } from './authentication-state'
import { federateToken } from "./federation-utils"
import { OauthAuthenticationInfo, stashOauth } from './oauth-utils'
import { describeError } from "../utils"
import { configStore } from './config-store'
import { StashProfile } from "../stash-profile";
import { AwsCredentials } from "./aws-credentials";


export class Auth0DeviceToken implements AuthStrategy {
  private state: AuthenticationState = { name: "unauthenticated" }

  constructor(
    private profile: StashProfile,
    private authInfo: OauthAuthenticationInfo
    ) {}

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
          awsCredentials: this.profile.keyManagement.awsCredentials.kind === "Federated"
            ? await federateToken(this.authInfo.accessToken, this.profile.keyManagement.awsCredentials)
            : {
              kind: "Explicit",
              accessKeyId: this.profile.keyManagement.awsCredentials.accessKeyId,
              secretAccessKey: this.profile.keyManagement.awsCredentials.secretAccessKey
            }

        }
      } else {
        this.state = {
          name: "authentication-expired",
          oauthInfo: {
            accessToken: this.authInfo.accessToken,
            refreshToken: this.authInfo.refreshToken,
            expiry: this.authInfo.expiry
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
      const idpHost = this.profile.identityProvider.host
      const clientId = this.profile.identityProvider.clientId
      const oauthInfo = await stashOauth.performTokenRefresh(idpHost, refreshToken, clientId)
      await configStore.saveProfileAuthInfo(this.profile.service.workspace, oauthInfo)
      const awsCredentials: AwsCredentials = this.profile.keyManagement.awsCredentials.kind === "Federated"
        ? await federateToken(this.authInfo.accessToken, this.profile.keyManagement.awsCredentials)
        : {
          kind: "Explicit",
          accessKeyId: this.profile.keyManagement.awsCredentials.accessKeyId,
          secretAccessKey: this.profile.keyManagement.awsCredentials.secretAccessKey
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

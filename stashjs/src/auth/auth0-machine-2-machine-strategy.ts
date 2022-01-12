import { OauthAuthenticationInfo, stashOauth } from './oauth-utils'
import { AuthenticationState } from './authentication-state'
import { AuthenticationDetails, AuthStrategy } from './auth-strategy'
import { Auth0Machine2Machine, StashConfiguration } from '../stash-config'
import { AuthenticationFailure, IllegalStateError } from '../errors'
import { AsyncResult, Err, Ok } from '../result'
import { AWSClientConfig, awsConfig } from '../aws'

export type StashProfileAuth0Machine2Machine = {
  config: Omit<StashConfiguration, 'identityProvider'> & { identityProvider: Auth0Machine2Machine }
}

export class Auth0Machine2MachineStrategy implements AuthStrategy {
  private state: AuthenticationState = { name: "unauthenticated" }

  constructor(private profile: StashProfileAuth0Machine2Machine) {}

  public async initialise(): AsyncResult<void, AuthenticationFailure> {
    const authenticated = await this.authenticate()
    if (authenticated.ok) {
      this.scheduleTokenRefresh()
      return Ok(void 0)
    } else {
      return Err(authenticated.error)
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
    const oauthInfo = await stashOauth.performTokenRefresh(
      this.profile.config.identityProvider.host,
      refreshToken,
      this.profile.config.identityProvider.clientId
    )

    if (oauthInfo.ok) {
      const aws = await awsConfig(this.profile.config.keyManagement.awsCredentials, oauthInfo.value.accessToken)
      if (aws.ok) {
        this.state = {
          name: "authenticated",
          oauthInfo: oauthInfo.value,
          awsConfig: aws.value
        }
      } else {
        this.state = {
          name: "authentication-failed",
          error: AuthenticationFailure(aws.error)
        }
      }
    } else {
      this.state = {
        name: "authentication-failed",
        error: oauthInfo.error
      }
    }
  }

  private async authenticate(): AsyncResult<SuccessfulAuthentication, AuthenticationFailure> {
    const oauthInfo = await stashOauth.authenticateViaClientCredentials(
      this.profile.config.identityProvider.host,
      this.profile.config.service.host,
      this.profile.config.identityProvider.clientId,
      this.profile.config.identityProvider.clientSecret
    )

    if (oauthInfo.ok) {
      const aws = await awsConfig(this.profile.config.keyManagement.awsCredentials, oauthInfo.value.accessToken)
      if (aws.ok) {
        this.state = {
          name: "authenticated",
          oauthInfo: oauthInfo.value,
          awsConfig: aws.value
        }
        return Ok(this.state)
      } else {
        this.state = { name: "authentication-failed", error: AuthenticationFailure(aws.error) }
        return Err(AuthenticationFailure(aws.error))
      }
    } else {
        this.state = { name: "authentication-failed", error: oauthInfo.error }
        return Err(oauthInfo.error)
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

export type SuccessfulAuthentication = {
  readonly name: "authenticated",
  readonly oauthInfo: OauthAuthenticationInfo,
  readonly awsConfig: AWSClientConfig
}
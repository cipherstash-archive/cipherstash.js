import { AuthStrategy } from "./auth-strategy"
import { stashOauth, OauthAuthenticationInfo } from './oauth-utils'
import { Auth0DeviceCode, StashConfiguration } from "../stash-config"
import * as open from 'open'
import { AsyncResult, Ok, Err } from "../result"
import { AuthenticationFailure } from "../errors"
import { profileStore } from './profile-store'

export type StashProfileAuth0DeviceCode = {
  name: string,
  config: Omit<StashConfiguration, 'identityProvider'> & { identityProvider: Auth0DeviceCode }
}

export class Auth0DeviceCodeStrategy implements AuthStrategy<OauthAuthenticationInfo> {
  private oauthCreds: OauthAuthenticationInfo = { accessToken: "", refreshToken: "", expiry: 0 }
  private cacheRead: boolean = false

  constructor(private profile: StashProfileAuth0DeviceCode) { }

  public stillFresh(): boolean {
    return !this.needsRefresh()
  }

  public async getAuthenticationDetails(): AsyncResult<OauthAuthenticationInfo, AuthenticationFailure> {
    if (!this.cacheRead) {
      await this.readCachedToken()
    }

    if (this.needsRefresh()) {
      const tokenResult = await this.acquireAccessToken()
      if (!tokenResult.ok) {
        return Err(tokenResult.error)
      }
    }

    return Ok(this.oauthCreds)
  }

  private needsRefresh(): boolean {
    return (Date.now() / 1000 - EXPIRY_BUFFER_SECONDS) > this.oauthCreds.expiry
  }

  private async readCachedToken() {
    const tokenInfo = await profileStore.readAccessToken(this.profile.name)
    if (tokenInfo.ok) {
      this.oauthCreds = tokenInfo.value
    }
    this.cacheRead = true
  }

  private async acquireAccessToken(): AsyncResult<void, AuthenticationFailure> {
    const { host, clientId } = this.profile.config.identityProvider

    const oauthInfo = await stashOauth.performTokenRefresh(host, this.oauthCreds.refreshToken, clientId)
    if (oauthInfo.ok) {
      this.oauthCreds = oauthInfo.value
      await profileStore.writeAccessToken(this.profile.name, oauthInfo.value)
      return Ok(void 0)
    } else {
      const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
        this.profile.config.identityProvider.host,
        this.profile.config.identityProvider.clientId,
        this.profile.config.service.host,
        this.profile.config.service.workspace
      )

      if (pollingInfo.ok) {
        console.info(`Visit ${pollingInfo.value.verificationUri} to complete authentication by following the below steps:`)
        console.info("")
        console.info(`1. Verify that this code matches the code in your browser`)
        console.info(generateUserCodeDisplay(pollingInfo.value.userCode))
        console.info(`2. If the codes match, click on the confirm button in the browser`)
        console.info("")
        console.info('Waiting for authentication...')

        if (!isInteractive()) {
          open.default(pollingInfo.value.verificationUri)
        }

        const authInfo = await stashOauth.pollForDeviceCodeAcceptance(
          this.profile.config.identityProvider.host,
          this.profile.config.identityProvider.clientId,
          pollingInfo.value.deviceCode,
          pollingInfo.value.interval
        )

        if (authInfo.ok) {
          this.oauthCreds = authInfo.value
          await profileStore.writeAccessToken(this.profile.name, authInfo.value)
          return Ok(void 0)
        } else {
          return Err(authInfo.error)
        }
      } else {
        return Err(pollingInfo.error)
      }
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

function generateUserCodeDisplay(userCode: string): string {

  const outerLine: string = userCode.split("").map(_ => "#").join("")
  const whiteSpace: string = userCode.split("").map(_ => " ").join("")

  const outerBorder: string = `#${outerLine}${outerLine}${outerLine}#`
  const leftBorder: string = `#${whiteSpace}`
  const rightBorder: string = `${whiteSpace}#`

  const emptyLine: string = `${leftBorder}${whiteSpace}${rightBorder}`
  const userCodeLine = `${leftBorder}${userCode}${rightBorder}`

  return (
    `
              ${outerBorder}
              ${emptyLine}
              ${userCodeLine}
              ${emptyLine}
              ${outerBorder}
              
        `
  )
}

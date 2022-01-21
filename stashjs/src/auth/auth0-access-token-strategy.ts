import { AuthenticationDetails, AuthStrategy } from "./auth-strategy";
import { Auth0AccessToken, StashConfiguration } from "../stash-config";
import { AWSClientConfig, awsConfig } from "../aws";
import { StashProfile } from "../stash-profile";
import { AuthenticationFailure } from "../errors";
import { AsyncResult, Err, Ok } from "../result";

export type StashProfileAuth0AccessToken = StashProfile & {
  config: Omit<StashConfiguration, 'identityProvider'> & { identityProvider: Auth0AccessToken }
}

export class Auth0AccessTokenStrategy implements AuthStrategy {
  private awsConfig: AWSClientConfig = {credentials: {accessKeyId: "", secretAccessKey: "", sessionToken: ""}, region: ""}

  constructor(private profile: StashProfileAuth0AccessToken) {}

  public async initialise(): AsyncResult<void, AuthenticationFailure> {
    const config = await awsConfig(
      this.profile.config.keyManagement.awsCredentials,
      this.profile.config.identityProvider.accessToken
    )
    if (config.ok) {
      this.awsConfig = config.value
      return Ok(void 0)
    } else {
      return Err(AuthenticationFailure(config.error))
    }
  }

  public isFresh(): boolean {
    const awsConfigExpiration = this.awsConfig.credentials!.expiration
    const awsCredsAreFresh = !awsConfigExpiration || awsConfigExpiration.getTime() > (new Date()).getTime()

    return awsCredsAreFresh
  }

  public async getAuthenticationDetails(): AsyncResult<AuthenticationDetails, AuthenticationFailure> {
    return Ok({
      authToken: this.profile.config.identityProvider.accessToken,
      awsConfig: this.awsConfig
    })
  }
}

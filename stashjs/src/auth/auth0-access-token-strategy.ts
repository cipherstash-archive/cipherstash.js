import { AuthenticationDetailsCallback, AuthStrategy } from "./auth-strategy";
import { Auth0AccessToken, StashConfiguration } from "../stash-config";
import { AWSClientConfig, awsConfig } from "../aws";
import { StashProfile } from "../stash-profile";

export type StashProfileAuth0AccessToken = StashProfile & {
  config: Omit<StashConfiguration, 'identityProvider'> & { identityProvider: Auth0AccessToken }
}

export class Auth0AccessTokenStrategy implements AuthStrategy {
  private awsConfig: AWSClientConfig = {credentials: {accessKeyId: "", secretAccessKey: ""}, region: ""}

  constructor(private profile: StashProfileAuth0AccessToken) {}

  public async initialise(): Promise<void> {
    try {
      this.awsConfig = await awsConfig(
        this.profile.config.keyManagement.awsCredentials,
        this.profile.config.identityProvider.accessToken
      )
      return Promise.resolve()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  public isFresh(): boolean {
    const awsConfigExpiration = this.awsConfig.credentials!.expiration
    const awsCredsAreFresh = !awsConfigExpiration || awsConfigExpiration.getTime() > (new Date()).getTime()

    return awsCredsAreFresh
  }

  public withAuthentication<R>(callback: AuthenticationDetailsCallback<R>): Promise<R> {
    return callback({authToken: this.profile.config.identityProvider.accessToken, awsConfig: this.awsConfig})
  }
}

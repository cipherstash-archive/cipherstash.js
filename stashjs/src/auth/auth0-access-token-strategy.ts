import { AuthenticationDetailsCallback, AuthStrategy } from "./auth-strategy";
import { Auth0AccessToken, StashProfile } from "../stash-profile";
import { AWSClientConfig, awsConfig } from "../aws";

export type StashProfileAuth0AccessToken = Omit<StashProfile, 'identityProvider'> & { identityProvider: Auth0AccessToken }

export class Auth0AccessTokenStrategy implements AuthStrategy {
  private awsConfig: AWSClientConfig = {credentials: {accessKeyId: "", secretAccessKey: ""}, region: ""}

  constructor(private profile: StashProfileAuth0AccessToken) {}

  public async initialise(): Promise<void> {
    try {
      this.awsConfig = await awsConfig(this.profile.keyManagement.awsCredentials, this.profile.identityProvider.accessToken)
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
    return callback({authToken: this.profile.identityProvider.accessToken, awsConfig: this.awsConfig})
  }
}

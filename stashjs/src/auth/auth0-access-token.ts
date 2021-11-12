import { AuthenticationDetailsCallback, AuthStrategy } from "./auth-strategy";
import { StashProfile } from "../stash-profile";
import { AWSClientConfig, awsConfig } from "../aws";

export class Auth0AccessToken implements AuthStrategy {
  private accessToken: string
  private awsConfig: AWSClientConfig = {credentials: {accessKeyId: "", secretAccessKey: ""}, region: ""}

  constructor(
    private profile: StashProfile
  ) {
    if (this.profile.identityProvider.kind !== "Auth0-AccessToken") {
      throw `Invalid identityProvider in profile passed Auth0AccessToken (expected 'Auth0-AccessToken', got '${profile.identityProvider.kind}')`
    }
    this.accessToken = this.profile.identityProvider.accessToken
  }

  public async initialise(): Promise<void> {
    try {
      this.awsConfig = await awsConfig(this.profile.keyManagement.awsCredentials, this.accessToken)
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
    return callback({authToken: this.accessToken, awsConfig: this.awsConfig})
  }
}

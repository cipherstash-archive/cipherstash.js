import { StashConfiguration } from "./stash-config";
import { OauthAuthenticationInfo } from './auth/oauth-utils';
import { AuthStrategy, Memo, MemoBuilder, withFreshCredentials } from "./auth/auth-strategy";
import { AWSClientConfig } from "./auth/aws-client-config";
import { Auth0AccessTokenStrategy, StashProfileAuth0AccessToken } from './auth/auth0-access-token-strategy';
import { Auth0DeviceCodeStrategy, StashProfileAuth0DeviceCode } from './auth/auth0-device-code-strategy';
import { Auth0Machine2MachineStrategy, StashProfileAuth0Machine2Machine } from './auth/auth0-machine-2-machine-strategy';
import { AWSClientConfigExplicitStrategy } from './auth/aws-client-config-explicit-strategy';
import { AWSClientConfigFederatedStrategy } from './auth/aws-client-config-federated-strategy';
import { Ok } from './result';

/**
 * A StashProfile consists of configuration + credentials, which is all of the
 * information required to establish a Stash connection.
 */
export class StashProfile {
  /**
   * The name of the profile. This is the directory name where the profile will be stored `$HOME/.cipherstash/<name>`.
   */
  readonly name: string

  /**
   * The configuration for this StashProfile
   */
  readonly config: StashConfiguration

  constructor(name: string, config: StashConfiguration) {
    this.name = name
    this.config = config
  }

  public withFreshDataServiceCredentials<R>(builder: MemoBuilder<OauthAuthenticationInfo, R>): Memo<R> {
    return withFreshCredentials<OauthAuthenticationInfo, R>(builder, this.makeDataServiceCredentialsAuthStrategy())
  }

  public withFreshKMSCredentials<R>(builder: MemoBuilder<AWSClientConfig, R>): Memo<R> {
    return withFreshCredentials<AWSClientConfig, R>(builder, this.makeKMSCredentialsAuthStrategy())
  }

  private makeDataServiceCredentialsAuthStrategy(): AuthStrategy<OauthAuthenticationInfo> {
    switch (this.config.identityProvider.kind) {
      case "Auth0-AccessToken": return new Auth0AccessTokenStrategy(this as StashProfileAuth0AccessToken)
      case "Auth0-DeviceCode": return new Auth0DeviceCodeStrategy(this as StashProfileAuth0DeviceCode)
      case "Auth0-Machine2Machine": return new Auth0Machine2MachineStrategy(this as StashProfileAuth0Machine2Machine)
    }
  }

  private makeKMSCredentialsAuthStrategy(): AuthStrategy<AWSClientConfig> {
    switch (this.config.keyManagement.awsCredentials.kind) {
      case "Explicit": return new AWSClientConfigExplicitStrategy(this.config.keyManagement.awsCredentials)
      case "Federated": return new AWSClientConfigFederatedStrategy(this.config.keyManagement.awsCredentials, this.withFreshDataServiceCredentials(async (creds) => Ok(creds)))
    }
  }
}

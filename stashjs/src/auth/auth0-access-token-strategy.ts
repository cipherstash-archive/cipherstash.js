import { AuthStrategy } from "./auth-strategy";
import { OauthAuthenticationInfo } from './oauth-utils';
import { Auth0AccessToken, StashConfiguration } from "../stash-config";
import { AuthenticationFailure } from "../errors";
import { AsyncResult, Ok } from "../result";

export type StashProfileAuth0AccessToken = {
  config: Omit<StashConfiguration, 'identityProvider'> & { identityProvider: Auth0AccessToken }
}

export class Auth0AccessTokenStrategy implements AuthStrategy<OauthAuthenticationInfo> {
  constructor(private profile: StashProfileAuth0AccessToken) {}

  public stillFresh(): boolean {
    return true
  }

  public async getAuthenticationDetails(): AsyncResult<OauthAuthenticationInfo, AuthenticationFailure> {
    return Ok({
      accessToken: this.profile.config.identityProvider.accessToken,
      refreshToken: "",
      expiry: 2**64-1
    })
  }
}

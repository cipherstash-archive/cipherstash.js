import { StashProfile } from '../stash-profile'
import { AuthStrategy } from './auth-strategy'
import { Auth0AccessTokenStrategy, StashProfileAuth0AccessToken } from './auth0-access-token-strategy'
import { Auth0DeviceCodeStrategy, StashProfileAuth0DeviceCode } from './auth0-device-code-strategy'
import { Auth0Machine2MachineStrategy, StashProfileAuth0Machine2Machine } from './auth0-machine-2-machine-strategy'

export function makeAuthStrategy(profile: StashProfile): AuthStrategy {
  switch (profile.config.identityProvider.kind) {
    case "Auth0-AccessToken": return new Auth0AccessTokenStrategy(profile as StashProfileAuth0AccessToken)
    case "Auth0-DeviceCode": return new Auth0DeviceCodeStrategy(profile as StashProfileAuth0DeviceCode)
    case "Auth0-Machine2Machine": return new Auth0Machine2MachineStrategy(profile as StashProfileAuth0Machine2Machine)
  }
}

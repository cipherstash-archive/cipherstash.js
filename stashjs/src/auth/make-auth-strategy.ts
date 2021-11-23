import { StashProfile } from '../stash-profile'
import { AuthStrategy } from './auth-strategy'
import { Auth0AccessTokenStrategy } from './auth0-access-token-strategy'
import { Auth0DeviceCodeStrategy } from './auth0-device-code-strategy'
import { Auth0Machine2MachineStrategy } from './auth0-machine-2-machine-strategy'

export function makeAuthStrategy(profile: StashProfile): AuthStrategy {
  switch (profile.identityProvider.kind) {
    // NOTE: the { ...profile, identityProvider: profile.identityProvider }
    // idiom may seem pointless but it has the effect of narrowing the type and
    // we don't need to cast.
    case "Auth0-AccessToken": return new Auth0AccessTokenStrategy({ ...profile, identityProvider: profile.identityProvider })
    case "Auth0-DeviceCode": return new Auth0DeviceCodeStrategy({ ...profile, identityProvider: profile.identityProvider })
    case "Auth0-Machine2Machine": return new Auth0Machine2MachineStrategy({ ...profile, identityProvider: profile.identityProvider })
  }
}

import { StashProfile } from '../stash-profile'
import { AuthStrategy } from './auth-strategy'
import { Auth0AccessToken } from './auth0-access-token'
import { Auth0DeviceCode } from './auth0-device-code'
import { Auth0Machine2Machine } from './auth0-machine-2-machine'
import { configStore } from './config-store'

export async function makeAuthStrategy(profile: StashProfile): Promise<AuthStrategy> {
  switch (profile.identityProvider.kind) {
    case "Auth0-AccessToken": return new Auth0AccessToken(profile)
    case "Auth0-DeviceCode": return new Auth0DeviceCode(profile, await configStore.loadProfileAuthInfo(profile.service.workspace))
    case "Auth0-Machine2Machine": return new Auth0Machine2Machine(profile)
  }
}

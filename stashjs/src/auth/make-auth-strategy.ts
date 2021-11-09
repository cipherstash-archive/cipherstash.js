import { StashProfile } from '../stash-profile'
import { AuthStrategy } from './auth-strategy'
import { Auth0DeviceToken } from './auth0-device-token'
import { Auth0Machine2Machine } from './auth0-machine-2-machine'
import { configStore } from './config-store'

export async function makeAuthStrategy(profile: StashProfile): Promise<AuthStrategy> {
  switch (profile.identityProvider.kind) {
    case "Auth0-DeviceCode": return new Auth0DeviceToken(profile, await configStore.loadProfileAuthInfo(profile.service.workspace))
    case "Auth0-Machine2Machine": return new Auth0Machine2Machine(profile)
  }
}
import { GluegunCommand } from 'gluegun'
import * as open from 'open'
import { Options } from 'gluegun/build/types/domain/options'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'
import { AxiosResponse } from 'axios'
import { makeHttpsClient } from '../https-client'
import { isInteractive } from '../terminal'

import {
  profileStore,
  defaults,
  stashOauth,
  StashProfile,
  makeAuthStrategy,
  errors
} from '@cipherstash/stashjs'


// A first time login (saves a profile for that workspace + credentials)
// stash login --workspace foo
//
// A subsequent login (uses the default profile if there is one, or the sole profile if there is one single profile)
// stash login
//
// A subsequent login using the default (or sole) profile
// stash login --profile bar <- a subsequent login using a named profile (edited)
//
// new login to workspace foo that will be saved in profile bar
// stash login --workspace foo --profile bar

const command: GluegunCommand = {
  name: 'login',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox
    const options = parameters.options

    if (isNewLogin(options)) {
      const basicProfile = buildBasicStashProfile(options)
      const consoleApiHost: string = options.consoleApiHost || 'console.cipherstash.com'
      const consoleApiPort: number = options.consoleApiPort || 443

      const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
        basicProfile.config.identityProvider.host,
        basicProfile.config.identityProvider.clientId,
        basicProfile.config.service.host,
        basicProfile.config.service.workspace
      )

      if (!pollingInfo.ok) {
        print.error(
          'An error occurred and "stash login" could not complete successfully'
        )
        print.error(`Reason: ${errors.toErrorMessage(pollingInfo.error)}`)
        process.exit(1)
        return
      }

      print.info(`Visit ${pollingInfo.value.verificationUri} to complete authentication`)
      print.info('Waiting for authentication...')

      if (!isInteractive()) {
        await open(pollingInfo.value.verificationUri)
      }

      const authInfo = await stashOauth.pollForDeviceCodeAcceptance(
        basicProfile.config.identityProvider.host,
        basicProfile.config.identityProvider.clientId,
        pollingInfo.value.deviceCode,
        pollingInfo.value.interval
      )

      if (!authInfo.ok) {
        print.error(
          'An error occurred and "stash login" could not complete successfully'
        )
        print.error(`Reason: ${errors.toErrorMessage(authInfo.error)}`)
        process.exit(1)
        return
      }

      const workspace = basicProfile.config.service.workspace

      const response = await makeHttpsClient(
        consoleApiHost,
        consoleApiPort
      ).get(`/api/meta/workspaces/${encodeURIComponent(workspace)}`, {
        headers: {
          Authorization: `Bearer ${authInfo.value.accessToken}`
        }
      })

      const saved = await profileStore.saveProfile(buildCompletedStashProfile(basicProfile, response))
      if (saved.ok) {
        print.info(`Workspace configuration and authentication details have been saved in dir ~/.cipherstash`)
      } else {
        print.error(`Failed to save profile: ${saved.error.message}`)
      }
    } else {
      let profile = options.profile ? await profileStore.loadProfile(options.profile) : await profileStore.loadDefaultProfile()
      if (profile.ok) {
        const authStrategy = makeAuthStrategy(profile.value)
        const login = await authStrategy.initialise()
        if (login.ok) {
          print.info(`Login successful`)
        } else {
          print.error(`Login failed: ${login.error.message}`)
        }
      }
    }
  }
}

// The heuristic is that if a workspace is provided as a command line option
// then we are creating a new profile and we consider this a first time login.
function isNewLogin(options: Options): boolean {
  return !!options.workspace
}

// This utility deeply checks that T is assignment-compatible with Target.
// Field types that are not assignment compatible will be converted to `never`.
type AssignableTo<Target, T> =
    T extends Target ? T
  : T extends object ? {
    [F in keyof T]:
      F extends keyof Target ?
        AssignableTo<Target[F], T[F]>
      : never
  }
  : never

// Represents the default parts of the profile that can be determined before
// querying the Console API.
//
// TODO: we should remove the federated key details from StashConfiguration and
// store them seperately like we do for access tokens. StashConfiguration should
// be *static*.
type BasicStashProfile = AssignableTo<StashProfile, {
  name: StashProfile['name'],
  config: {
    service: StashProfile['config']['service']
    identityProvider: {
      kind: "Auth0-DeviceCode",
      host: string,
      clientId: string
    },
    keyManagement: {
      kind: StashProfile['config']['keyManagement']['kind']
      awsCredentials: {
        kind: StashProfile['config']['keyManagement']['awsCredentials']['kind']
      }
    }
  }
}>

function buildBasicStashProfile(options: Options): BasicStashProfile {
  const serviceHost: string = options.serviceHost || defaults.service.host
  const servicePort: number = options.servicePort || 443
  const identityProviderHost: string = options.identityProviderHost || defaults.identityProvider.host
  const identityProviderClientId: string = options.identityProviderClientId || defaults.identityProvider.clientId
  const workspace: string = options.workspace

  return {
    name: options.profile || workspace,
    config: {
      service: {
        workspace,
        host: serviceHost,
        port: servicePort
      },
      identityProvider: {
        kind: 'Auth0-DeviceCode',
        host: identityProviderHost,
        clientId: identityProviderClientId
      },
      keyManagement: {
        kind: 'AWS-KMS',
        awsCredentials: {
          kind: 'Federated',
        },
      }
    },
  }
}

function buildCompletedStashProfile(basicProfile: BasicStashProfile, response: AxiosResponse<any, any>): StashProfile {
  return {
    name: basicProfile.name,
    config: {
      ...basicProfile.config,
      keyManagement: {
        kind: 'AWS-KMS',
        awsCredentials: {
          kind: 'Federated',
          region: response.data.keyRegion,
          roleArn: response.data.keyRoleArn
        },
        key: {
          arn: response.data.keyId,
          namingKey: response.data.namingKey,
          region: response.data.keyRegion
        }
      }
    }
  }
}

export default command

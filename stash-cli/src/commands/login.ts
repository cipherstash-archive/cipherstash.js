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
  OauthAuthenticationInfo,
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
  description: 'Login to the workspace',
  alias: 'l',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox
    const options = parameters.options

    if (options.help) {
      // TODO: It would be neat if we could read this summary from the docs directly
      print.info("Usage: stash login [--workspace <workspace>] [--profile <profile>] [--help]")
      print.info("")
      print.info("Login to the given workspace\n")
      print.info("If this is a first time login, you must provide a workspace option")
      print.info("")
      print.info("    stash login --workspace ABCD1234")
      print.info("")
      print.info("Otherwise, stash will attempt to perform a fresh login with your default profile")
      print.info("See also https://docs.cipherstash.com/reference/stash-cli/stash-login.html")
      print.info("")
      process.exit(1)
      return
    }

    if (isNewLogin(options)) {
      const basicProfile = buildBasicStashProfile(options)

      const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
        basicProfile.config.identityProvider.host,
        basicProfile.config.identityProvider.clientId,
        basicProfile.config.service.host,
        basicProfile.config.service.workspace
      )

      if (!pollingInfo.ok) {
        print.error('An error occurred and "stash login" could not complete successfully')
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
        print.error('An error occurred and "stash login" could not complete successfully')
        print.error(`Reason: ${errors.toErrorMessage(authInfo.error)}`)
        process.exit(1)
        return
      }

      const workspace = basicProfile.config.service.workspace

      const response = await makeHttpsClient('console.cipherstash.com', 443)
        .get(`/api/meta/workspaces/${encodeURIComponent(workspace)}`, {
          headers: {
            Authorization: `Bearer ${authInfo.value.accessToken}`
          }
        })
        .catch(error => {
          print.error(
            `Failed to load workspace metadata. API responded with code: '${
              error.response.status
            }' and body: '${JSON.stringify(error.response.data)}'`
          )
          process.exit(1)
        })

      if (!response.data) {
        print.error(`Could not load workspace metadata: API returned empty response`)
        process.exit(1)
        return
      }

      const saved = await profileStore.saveProfile(buildCompletedStashProfile(basicProfile, authInfo.value, response))
      if (saved.ok) {
        print.info(`Workspace configuration and authentication details have been saved in dir ~/.cipherstash`)
      } else {
        print.error(`Failed to save profile: ${saved.error.message}`)
      }
    } else {
      let profile = options.profile
        ? await profileStore.loadProfile(options.profile)
        : await profileStore.loadDefaultProfile()
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
type AssignableTo<Target, T> = T extends Target
  ? T
  : T extends object
  ? {
      [F in keyof T]: F extends keyof Target ? AssignableTo<Target[F], T[F]> : never
    }
  : never

// Represents the default parts of the profile that can be determined before
// querying the Console API.
//
// TODO: we should remove the federated key details from StashConfiguration and
// store them seperately like we do for access tokens. StashConfiguration should
// be *static*.
type BasicStashProfile = AssignableTo<
  StashProfile,
  {
    name: StashProfile['name']
    config: {
      service: StashProfile['config']['service']
      identityProvider: {
        kind: 'Auth0-DeviceCode'
        host: string
        clientId: string
      }
      keyManagement: {
        kind: StashProfile['config']['keyManagement']['kind']
        awsCredentials: {
          kind: StashProfile['config']['keyManagement']['awsCredentials']['kind']
        }
      }
    }
  }
>

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
          kind: 'Federated'
        }
      }
    }
  }
}

function buildCompletedStashProfile(
  basicProfile: BasicStashProfile,
  oauthCreds: OauthAuthenticationInfo,
  response: AxiosResponse<any, any>
): StashProfile {
  return {
    name: basicProfile.name,
    oauthCreds: oauthCreds,
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

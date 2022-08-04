import { GluegunCommand } from "gluegun"
import { Options } from "gluegun/build/types/domain/options"
import { Toolbox } from "gluegun/build/types/domain/toolbox"
import { AxiosResponse } from "axios"
import { makeHttpsClient } from "../https-client"

import { profileStore, defaults, StashProfile, errors, Ok, describeError } from "@cipherstash/stashjs"

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
  name: "login",
  description: "Login to the workspace",
  alias: "l",

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox
    const options = parameters.options

    if (options.help) {
      printHelp(toolbox)
      process.exit(0)
    }

    if (isNewLogin(options)) {
      const basicProfile = buildBasicStashProfile(options)

      // If there is an existing profile with the same name it MUST be for the same workspace.
      const existing = await profileStore.loadProfile(basicProfile.name)
      if (existing.ok) {
        if (existing.value.config.service.workspace !== basicProfile.config.service.workspace) {
          print.error(
            `There is already a saved profile called ${basicProfile.name} but for a different workspace. Try again, but specify a different name using the --profile option.`
          )
          process.exit(1)
        }
      }

      const authInfo = await basicProfile.withFreshDataServiceCredentials(async creds => Ok(creds)).freshValue()

      if (!authInfo.ok) {
        print.error('An error occurred and "stash login" could not complete successfully')
        print.error(`Reason: ${errors.toErrorMessage(authInfo.error)}`)
        process.exit(1)
      }

      const workspace = basicProfile.config.service.workspace

      const response = await makeHttpsClient("console.cipherstash.com", 443)
        .get(`/api/meta/workspaces/${encodeURIComponent(workspace)}`, {
          headers: {
            Authorization: `Bearer ${authInfo.value.accessToken}`,
          },
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
      }

      const saved = await profileStore.saveProfile(buildCompletedStashProfile(basicProfile, response))
      if (saved.ok) {
        const savedToken = await profileStore.writeAccessToken(basicProfile.name, authInfo.value)
        if (savedToken.ok) {
          print.info(
            `Workspace configuration and authentication details have been saved in ~/.cipherstash/${basicProfile.name}`
          )
        } else {
          print.error("Failed to store cached authentication details")
          print.error(describeError(savedToken.error))
        }
      } else {
        print.error("Failed to save profile")
        print.error(describeError(saved.error))
      }
    } else {
      const profile = options.profile
        ? await profileStore.loadProfile(options.profile)
        : await profileStore.loadDefaultProfile()
      if (profile.ok) {
        const login = await profile.value
          .withFreshDataServiceCredentials(async ({ accessToken }) => Ok(accessToken))
          .freshValue()
        if (login.ok) {
          print.info(`Login successful`)
          print.info("")
          print.info("If this is your first time using CipherStash, follow the Getting Started guide:")
          print.info(
            `https://cipherstash.com/quickstart/?ws=${encodeURIComponent(profile.value.config.service.workspace)}`
          )
        } else {
          print.error("Login failed")
          print.error(describeError(login.error))
        }
      } else {
        print.error("No default profile found. If this is a first time login, then the --workspace option is required.")
        printHelp(toolbox)
        process.exit(1)
      }
    }
  },
}

// The heuristic is that if a workspace is provided as a command line option
// then we are creating a new profile and we consider this a first time login.
function isNewLogin(options: Options): boolean {
  return !!options.workspace
}

function buildBasicStashProfile(options: Options): StashProfile {
  const serviceHost: string = options.serviceHost || defaults.service.host
  const servicePort: number = options.servicePort || 443
  const identityProviderHost: string = options.identityProviderHost || defaults.identityProvider.host
  const identityProviderClientId: string = options.identityProviderClientId || defaults.identityProvider.clientId
  const workspace: string = options.workspace

  return new StashProfile(options.profile || "default", {
    service: {
      workspace,
      host: serviceHost,
      port: servicePort,
    },
    identityProvider: {
      kind: "Auth0-DeviceCode",
      host: identityProviderHost,
      clientId: identityProviderClientId,
    },
    keyManagement: {
      kind: "AWS-KMS",
      awsCredentials: {
        kind: "Federated",
        region: "",
        roleArn: "",
      },
      key: {
        arn: "",
        namingKey: "",
        region: "",
      },
    },
  })
}

function buildCompletedStashProfile(basicProfile: StashProfile, response: AxiosResponse<any, any>): StashProfile {
  return new StashProfile(basicProfile.name, {
    ...basicProfile.config,
    keyManagement: {
      kind: "AWS-KMS",
      awsCredentials: {
        kind: "Federated",
        region: response.data.keyRegion,
        roleArn: response.data.keyRoleArn,
      },
      key: {
        arn: response.data.keyId,
        namingKey: response.data.namingKey,
        region: response.data.keyRegion,
      },
    },
  })
}

function printHelp(toolbox: Toolbox): void {
  const { print } = toolbox
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
}

export default command

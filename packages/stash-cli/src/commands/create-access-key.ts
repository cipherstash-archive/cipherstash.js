import { GluegunCommand } from "@cipherstash/gluegun"
import { Toolbox } from "@cipherstash/gluegun/build/types/domain/toolbox"

import { Stash, StashInternal, describeError, Ok, errors } from "@cipherstash/stashjs"
import { makeHttpsClient } from "../https-client"

const command: GluegunCommand = {
  name: "create-key",

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox
    const options = parameters.options

    function exitWithUsage(): never {
      print.info("Usage: stash create-key --name <name for access key> [--profile <profile>] [--help]")
      print.info("")
      print.info("Creates an access key for the workspace\n")
      print.info("")
      process.exit(0)
    }

    if (options.help) {
      exitWithUsage()
    }

    if (!parameters.options) {
      exitWithUsage()
    }

    const keyName: string | undefined = parameters.options.name

    if (!keyName) {
      print.error(`Expected an access key name`)
      print.error(`Example: stash create-key --name keyName`)
      process.exit(1)
    }

    print.info(`Generating access key ${keyName}.........`)
    print.info("")
    print.info("")

    const profileName: string | undefined = parameters.options.profile

    const profile = await Stash.loadProfile({
      profileName,
    }).catch(error => {
      print.error(`Unexpected error while loading profile. Reason: "${describeError(error)}"`)
      process.exit(1)
    })

    const connection = await StashInternal.connect(profile)
    if (!connection.ok) {
      print.error(`Authentication failed - please try to login again with "stash login"`)
      process.exit(1)
    }
    const workspaceId = profile.config.service.workspace

    const authInfo = await profile.withFreshDataServiceCredentials(async creds => Ok(creds)).freshValue()

    if (!authInfo.ok) {
      print.error('An error occurred and "stash login" could not complete successfully')
      print.error(`Reason: ${errors.toErrorMessage(authInfo.error)}`)
      process.exit(1)
    }

    const response = await makeHttpsClient("console.cipherstash.com", 443)
      .post(
        "/api/access-key",
        { workspaceId, keyName },
        {
          headers: {
            Authorization: `Bearer ${authInfo.value.accessToken}`,
          },
        }
      )
      .catch(error => {
        print.error(
          `Failed to create creds. API responded with code: '${error.response?.status}' and body: '${JSON.stringify(
            error.response.data
          )}'`
        )
        process.exit(1)
      })
    const accessKey = response.data

    print.info("Access Key created!")
    print.info("")
    print.info("")
    print.info(`The key ${keyName} for workspace ${workspaceId} is:`)
    print.info("")
    print.info(`CS_IDP_CLIENT_SECRET=${accessKey}`)
    print.info("")
    print.info(
      "For more details on how to use this key visit https://docs.cipherstash.com/reference/client-configuration.html "
    )
    // TODO: Update this link when docs are updated
    print.info("")
    print.info("")
    print.info("")
  },
}

export default command

import { GluegunCommand } from "@cipherstash/gluegun"
import { Toolbox } from "@cipherstash/gluegun/build/types/domain/toolbox"

import { Stash, StashInternal, describeError, Ok, errors } from "@cipherstash/stashjs"
import { makeHttpsClient } from "../https-client"

const command: GluegunCommand = {
  name: "create-key",

  run: async (toolbox: Toolbox) => {
    const { parameters } = toolbox
    const options = parameters.options

    function exitWithUsage(): never {
      console.log("Usage: stash create-key --name <name for access key> [--profile <profile>] [--pipe] [--help]")
      console.log("")
      console.log("Creates an access key for the workspace\n")
      console.log("")
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
      console.error(`Expected an access key name`)
      console.error(`Example: stash create-key --name keyName`)
      process.exit(1)
    }

    console.log(`Generating access key ${keyName}.........`)
    console.log("")
    console.log("")

    const profileName: string | undefined = parameters.options.profile

    const profile = await Stash.loadProfile({
      profileName,
    }).catch(error => {
      console.error(`Unexpected error while loading profile. Reason: "${describeError(error)}"`)
      process.exit(1)
    })

    const connection = await StashInternal.connect(profile)
    if (!connection.ok) {
      console.error(`Authentication failed - please try to login again with "stash login"`)
      process.exit(1)
    }
    const workspaceId = profile.config.service.workspace

    const authInfo = await profile.withFreshDataServiceCredentials(async creds => Ok(creds)).freshValue()

    if (!authInfo.ok) {
      console.error('An error occurred and "stash login" could not complete successfully')
      console.error(`Reason: ${errors.toErrorMessage(authInfo.error)}`)
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
        console.error(
          `Failed to create creds. API responded with code: '${error.response?.status}' and body: '${JSON.stringify(
            error.response.data
          )}'`
        )
        process.exit(1)
      })
    const accessKey = response.data

    console.log("Access Key created!")
    console.log("")
    console.log("")
    console.log(`The key ${keyName} for workspace ${workspaceId} is:`)
    console.log("")
    console.log(`CS_IDP_CLIENT_SECRET=${accessKey}`)
    console.log("")
    console.log(
      "For more details on how to use this key visit https://docs.cipherstash.com/reference/client-configuration.html "
    )
    // TODO: Update this link when docs are updated
    console.log("")
    console.log("")
    console.log("")
  },
}

export default command

import { GluegunCommand } from "gluegun"
import { Toolbox } from "gluegun/build/types/domain/toolbox"

import { Stash, StashInternal, describeError, Ok, errors } from "@cipherstash/stashjs"
import { makeHttpsClient } from "../https-client"

const command: GluegunCommand = {
  name: "revoke-key",

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox
    const options = parameters.options

    function exitWithUsage(): never {
      print.info("Usage: stash revoke-key --name <name of access key> [--profile <profile>] [--help]")
      print.info("")
      print.info("Revokes the access key from the workspace\n")
      print.info("")
      process.exit(0)
    }

    if (options.help) {
      exitWithUsage()
    }

    if (!options) {
      exitWithUsage()
    }

    const keyName: string | undefined = parameters.options.name

    if (!keyName) {
      print.error(`Expected the access key name`)
      print.error(`Example: stash revoke-key --name accessKeyName`)
      print.error(`To find key name try using the command stash list-keys`)
      process.exit(1)
    }

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

    await makeHttpsClient("console.cipherstash.com", 443)
      .delete("/api/access-key", {
        headers: {
          Authorization: `Bearer ${authInfo.value.accessToken}`,
        },
        data: { workspaceId, keyName },
      })
      .catch(error => {
        print.error(
          `Failed to delete access key. API responded with code: '${
            error.response?.status
          }' and body: '${JSON.stringify(error.response.data)}'`
        )
        process.exit(1)
      })

    print.info("")
    print.info("")
    print.info(`Access Key ${keyName} for workspace ${workspaceId} revoked.`)
    print.info("")
    print.info("")
  },
}

export default command

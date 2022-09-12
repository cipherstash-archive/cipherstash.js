import { GluegunCommand } from "@cipherstash/gluegun"
import { Toolbox } from "@cipherstash/gluegun/build/types/domain/toolbox"

import { Stash, StashInternal, describeError, Ok, errors } from "@cipherstash/stashjs"
import { makeHttpsClient } from "../https-client"

type AccessKey = {
  id: string
  keyName: string
  keyId: string
  workspaceId: string
  createdAt: string
  lastUsedAt: string
}

const command: GluegunCommand = {
  name: "list-keys",

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox
    const options = parameters.options

    function exitWithUsage(): never {
      print.info("Usage: stash list-keys [--profile <profile>] [--help]")
      print.info("")
      print.info("Lists the access keys for a workspace\n")
      print.info("")
      process.exit(0)
    }

    if (options.help) {
      exitWithUsage()
    }

    if (!parameters.array) {
      exitWithUsage()
    }

    if (!parameters.options) {
      exitWithUsage()
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
    const workspace = profile.config.service.workspace

    const authInfo = await profile.withFreshDataServiceCredentials(async creds => Ok(creds)).freshValue()

    if (!authInfo.ok) {
      print.error('An error occurred and "stash login" could not complete successfully')
      print.error(`Reason: ${errors.toErrorMessage(authInfo.error)}`)
      process.exit(1)
    }

    const response = await makeHttpsClient("console.cipherstash.com", 443)
      .get(`/api/access-keys/${encodeURIComponent(workspace)}`, {
        headers: {
          Authorization: `Bearer ${authInfo.value.accessToken}`,
        },
      })
      .catch(error => {
        print.error(
          `Failed to load access keys. API responded with code: '${error.response?.status}' and body: '${JSON.stringify(
            error.response.data
          )}'`
        )
        process.exit(1)
      })

    const data: AccessKey[] = response.data
    const tbl = [["Name", "Key ID", "Workspace", "Created At", "Last Used At"]]

    Object.values(data).forEach(k => {
      tbl.push([k.keyName, k.keyId, k.workspaceId, k.createdAt, k.lastUsedAt])
    })
    print.table(tbl, { format: "lean" })
  },
}

export default command

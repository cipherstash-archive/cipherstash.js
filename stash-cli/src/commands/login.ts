import { GluegunCommand } from 'gluegun'
import * as open from 'open'
import { configStore, stashOauth, describeError } from '@cipherstash/stashjs'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

const command: GluegunCommand = {
  name: 'login',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const workspace: string | undefined = parameters.options.workspace || await configStore.loadDefaultProfileName()

    if (!workspace) {
      print.error('Error: no workspace was provided and a no default workspace is set')
      const workspaceIds = await configStore.loadProfileNames()
      if (workspaceIds.length > 0) {
        print.info(`stash-cli knows about the following workspaces: ${workspaceIds.join(", ")}`)
        print.info(`Either run 'stash config --default-workspace <workspace-id>' to set your default workspace, or`)
        print.info(`run 'stash login --workspace <workspace-id>' to sign in to a specific workspace`)
      } else {
        print.info(`run 'stash init --workspace <workspace-id>' sign into a workspace for the first time`)
      }
      process.exit(1)
    }

    const profile = workspace
      ? await configStore.loadProfile(workspace)
      : await configStore.loadDefaultProfile()

    try {
      const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
        profile.identityProvider.host,
        profile.identityProvider.clientId,
        profile.service.host,
        workspace
      )

      print.info(`Visit ${pollingInfo.verificationUri} to complete authentication`)
      print.info("Waiting for authentication...")

      // Only open the browser when running this command locally.  If we are
      // running under SSH then the browser will open on the remote host - which
      // is not what we want.  Instead the user can simply click the
      // verification link that gets printed.
      if (!isInteractive()) {
        await open(pollingInfo.verificationUri)
      }

      const authInfo = await stashOauth.pollForDeviceCodeAcceptance(
        profile.identityProvider.host,
        profile.identityProvider.clientId,
        pollingInfo.deviceCode,
        pollingInfo.interval
      )

      print.info("Login Successful")

      await configStore.saveProfileAuthInfo(workspace, authInfo)

      print.info(`Auth-token saved to ${configStore.configDir(workspace)}`)
    } catch (error) {
      print.error(`Could not login. Message from server: "${describeError(error)}"`)
    }
  },
}

module.exports = command

function isInteractive(): boolean {
  return process.env['SSH_CLIENT'] !== undefined || process.env['SSH_TTY'] !== undefined
}
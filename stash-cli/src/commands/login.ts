import { GluegunCommand } from 'gluegun'
import * as open from 'open'
import { profileStore, stashOauth, describeError, StashProfile } from '@cipherstash/stashjs'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

const command: GluegunCommand = {
  name: 'login',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const workspace: string | undefined = parameters.options.workspace || (await profileStore.loadDefaultProfile())?.name

    if (!workspace) {
      print.error(
        'Error: no workspace was provided and default workspace is set'
      )
      const workspaceIds = await profileStore.loadProfileNames()
      if (workspaceIds.length > 0) {
        print.info(
          `stash-cli knows about the following workspaces: ${workspaceIds.join(
            ', '
          )}`
        )
        print.info(
          `Either run 'stash config --default-workspace <workspace-id>' to set your default workspace, or`
        )
        print.info(
          `run 'stash login --workspace <workspace-id>' to sign in to a specific workspace`
        )
      } else {
        print.info(
          `run 'stash init --workspace <workspace-id>' sign into a workspace for the first time`
        )
      }
      process.exit(1)
    }

    const profile = workspace
      ? await profileStore.loadProfile(workspace)
      : await profileStore.loadDefaultProfile()

    if (profile.config.identityProvider.kind !== 'Auth0-DeviceCode') {
      print.error(
        `Error: unexpected kind of identity provider (got '${profile.config.identityProvider.kind}', expected 'Auth0-DeviceCode')`
      )
      process.exit(1)
    }

    try {
      const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
        profile.config.identityProvider.host,
        profile.config.identityProvider.clientId,
        profile.config.service.host,
        profile.config.service.workspace
      )

      print.info(
        `Visit ${pollingInfo.verificationUri} to complete authentication`
      )
      print.info('Waiting for authentication...')

      // Only open the browser when running this command locally.  If we are
      // running under SSH then the browser will open on the remote host - which
      // is not what we want.  Instead the user can simply click the
      // verification link that gets printed.
      if (!isInteractive()) {
        await open(pollingInfo.verificationUri)
      }

      const authInfo = await stashOauth.pollForDeviceCodeAcceptance(
        profile.config.identityProvider.host,
        profile.config.identityProvider.clientId,
        pollingInfo.deviceCode,
        pollingInfo.interval
      )

      const updatedProfile: StashProfile = { ...profile, creds: authInfo }

      print.info('Login Successful')

      await profileStore.saveProfile(updatedProfile)

      print.info(`Auth-token saved`)
    } catch (error) {
      print.error(
        `Could not login. Message from server: "${describeError(error)}"`
      )
    }
  }
}

module.exports = command

function isInteractive(): boolean {
  return (
    process.env['SSH_CLIENT'] !== undefined ||
    process.env['SSH_TTY'] !== undefined
  )
}

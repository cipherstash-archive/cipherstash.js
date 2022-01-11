import { GluegunCommand } from 'gluegun'
import * as open from 'open'
import { profileStore, stashOauth, StashProfile, errors } from '@cipherstash/stashjs'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

const command: GluegunCommand = {
  name: 'login',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    let workspace: string | undefined = parameters.options.workspace
    if (!workspace) {
      const defaultProfile = await profileStore.loadDefaultProfile()
      if (defaultProfile.ok) {
        workspace = defaultProfile.value.name
      } else {
        print.error('Error: no workspace was provided and default workspace is set')
        const workspaceIds = await profileStore.loadProfileNames()
        if (!workspaceIds.ok) {
          print.error('An error occurred and "stash login" could not complete successfully')
          print.error(`Reason: ${errors.toErrorMessage(workspaceIds.error)}`)
          process.exit(1)
          return
        }
        if (workspaceIds.value.length > 0) {
          print.info(
            `stash-cli knows about the following workspaces: ${workspaceIds.value.join(
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
        return
      }
    }


    const profile = workspace
      ? await profileStore.loadProfile(workspace)
      : await profileStore.loadDefaultProfile()

    if (!profile.ok) {
      print.error('An error occurred and "stash login" could not complete successfully')
      print.error(`Reason: ${errors.toErrorMessage(profile.error)}`)
      process.exit(1)
      return
    }

    if (profile.value.config.identityProvider.kind !== 'Auth0-DeviceCode') {
      print.error(
        `Error: unexpected kind of identity provider (got '${profile.value.config.identityProvider.kind}', expected 'Auth0-DeviceCode')`
      )
      process.exit(1)
    }

    const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
      profile.value.config.identityProvider.host,
      profile.value.config.identityProvider.clientId,
      profile.value.config.service.host,
      profile.value.config.service.workspace
    )

    if (!pollingInfo.ok) {
      print.error('An error occurred and "stash login" could not complete successfully')
      print.error(`Reason: ${errors.toErrorMessage(pollingInfo.error)}`)
      process.exit(1)
      return
    }

    print.info(
      `Visit ${pollingInfo.value.verificationUri} to complete authentication`
    )
    print.info('Waiting for authentication...')

    // Only open the browser when running this command locally.  If we are
    // running under SSH then the browser will open on the remote host - which
    // is not what we want.  Instead the user can simply click the
    // verification link that gets printed.
    if (!isInteractive()) {
      await open(pollingInfo.value.verificationUri)
    }

    const authInfo = await stashOauth.pollForDeviceCodeAcceptance(
      profile.value.config.identityProvider.host,
      profile.value.config.identityProvider.clientId,
      pollingInfo.value.deviceCode,
      pollingInfo.value.interval
    )

    if (!authInfo.ok) {
      print.error('An error occurred and "stash login" could not complete successfully')
      print.error(`Reason: ${errors.toErrorMessage(authInfo.error)}`)
      process.exit(1)
      return
    }

    const updatedProfile: StashProfile = { ...profile.value, oauthCreds: authInfo.value }

    print.info('Login Successful')

    await profileStore.saveProfile(updatedProfile)

    print.info(`Auth-token saved`)
  }
}

module.exports = command

function isInteractive(): boolean {
  return (
    process.env['SSH_CLIENT'] !== undefined ||
    process.env['SSH_TTY'] !== undefined
  )
}

import { GluegunCommand } from 'gluegun'
import * as open from 'open'
import { tokenStore, stashOauth, describeError } from '@cipherstash/stashjs'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

// This is the client ID configured in Auth0. It is not a secret
// and it is only used for initiating device code authentication.
const STASH_CLI_CLIENT_ID = 'tz5daCHFQLJRshlk9xr2Tl1G2nVJP5nv'

const IDP = 'cipherstash-dev.au.auth0.com'

const command: GluegunCommand = {
  name: 'login',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const audience = parameters.first
    const workspace: string | undefined = parameters.second

    if (!audience) {
      print.error('Error: an audience must be provided')
      process.exit(1)
    }

    try {
      const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
        IDP,
        STASH_CLI_CLIENT_ID,
        audience,
        workspace
      )

      print.info(`Visit ${pollingInfo.verificationUri} to complete authentication`)
      print.info("Waiting for authentication...")

      // Only open the browser when running this command locally.  If we are
      // running under SSH then the browser will open on the remote host - which
      // is not what we want.  Instead the user can simply click the
      // verification link that gets printed.
      if (!isRunningUnderSsh()) {
        await open(pollingInfo.verificationUri)
      }

      const authInfo = await stashOauth.pollForDeviceCodeAcceptance(
        IDP,
        STASH_CLI_CLIENT_ID,
        pollingInfo.deviceCode,
        pollingInfo.interval
      )

      print.info("Login Successful")

      await tokenStore.save(authInfo)

      print.info(`Auth-token saved to ${tokenStore.configDir()}`)
    } catch (error) {
      print.error(`Could not login. Message from server: "${describeError(error)}"`)
    }
  },
}

module.exports = command

function isRunningUnderSsh(): boolean {
  return process.env['SSH_CLIENT'] !== undefined || process.env['SSH_TTY'] !== undefined
}
import { GluegunCommand } from 'gluegun'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

import { profileStore, Stash, describeError } from '@cipherstash/stashjs'

const command: GluegunCommand = {
  name: 'logout',
  description: 'Remove cached authentication token',
  alias: 'lo',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox
    const options = parameters.options

    if (options.help) {
      print.info('Usage: stash logout [--profile <profile>] [--help]')
      print.info('')
      print.info('Remove cached authentication token')
      print.info('See also https://docs.cipherstash.com/reference/stash-cli/stash-login.html')
      print.info('')
      process.exit(0)
    }

    const profileName: string | undefined = parameters.options.profile

    const profile = await Stash.loadProfile({ profileName }).catch(error => {
      print.error(`Could not load profile. Reason: "${describeError(error)}"`)
      process.exit(1)
    })

    const deleted = await profileStore.deleteAccessToken(profile.name)
    if (deleted.ok) {
      print.info(`Cached authentication deleted for profile ${profile.name}`)
    } else {
      print.error(`Failed to delete cached authentication token for profile ${profile.name}`)
      print.error(describeError(deleted.error))
    }
  }
}

export default command

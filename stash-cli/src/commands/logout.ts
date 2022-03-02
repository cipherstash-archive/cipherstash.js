import { GluegunCommand } from 'gluegun'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

import { profileStore, StashProfile, errors, describeError, Result } from '@cipherstash/stashjs'

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
      return
    }

    const profileName: string | undefined = parameters.options.profile
    let profile: Result<StashProfile, errors.LoadProfileFailure>

    try {
      if (profileName) {
        profile = await profileStore.loadProfile(profileName)
      } else {
        profile = await profileStore.loadDefaultProfile()
      }

      if (!profile.ok) {
        print.error(`Could not load profile. Reason: "${describeError(profile.error)}"`)
        process.exit(1)
        return
      }
    } catch (error) {
      print.error(`Could not load profile. Reason: "${describeError(error)}"`)
      process.exit(1)
      return
    }

    const deleted = await profileStore.deleteAccessToken(profile.value.name)
    if (deleted.ok) {
      print.info(`Cached authentication deleted for profile ${profile.value.name}`)
    } else {
      print.error(
        `Failed to delete cached authentication token for profile ${profile.value.name}: ${deleted.error.message}`
      )
    }
  }
}

export default command

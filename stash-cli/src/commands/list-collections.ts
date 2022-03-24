import { GluegunCommand } from 'gluegun'
import { Stash, StashProfile, profileStore, describeError, Result, errors } from '@cipherstash/stashjs'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

const command: GluegunCommand = {
  name: 'list-collections',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const profileName: string | undefined = parameters.options.profile

    if (parameters.options.help) {
      print.info(`Usage: stash list-collections [--profile <profile>]`)
      process.exit(0)
    }

    try {
      let profile: Result<StashProfile, errors.LoadProfileFailure>
      if (profileName) {
        profile = await profileStore.loadProfile(profileName)
      } else {
        profile = await profileStore.loadDefaultProfile()
      }

      if (!profile.ok) {
        print.error(describeError(profile.error))
        process.exit(1)
      }

      const stash = await Stash.connect(profile.value)
      const collectionNames = await stash.listCollections()
      if (parameters.options.json) {
        print.info(JSON.stringify(collectionNames, null, 2))
      } else {
        print.info('  Name')
        print.info('  ------')
        collectionNames.forEach(collectionName => {
          print.info('  ' + collectionName)
        })
      }
    } catch (error) {
      print.error(describeError(error))
      process.exit(1)
    }
  }
}

export default command

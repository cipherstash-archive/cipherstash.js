import { GluegunCommand } from 'gluegun'
import { Stash, StashProfile, profileStore, describeError, Result, errors } from '@cipherstash/stashjs'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

const command: GluegunCommand = {
  name: 'drop-collection',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const profileName: string | undefined = parameters.options.profile

    const collectionName: string | undefined = parameters.first
    if (collectionName === undefined) {
      print.error('No collection name specified.')
      process.exit(1)
      return
    }

    try {
      let profile: Result<StashProfile, errors.LoadProfileFailure>
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

      const stash = await Stash.connect(profile.value)
      await stash.deleteCollection(collectionName)
      print.info(`Collection ${collectionName} removed.`)
    } catch (error) {
      print.error(`Could not drop collection ${collectionName}. Reason: "${describeError(error)}"`)
    }
  }
}

export default command

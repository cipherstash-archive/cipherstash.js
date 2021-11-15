import { GluegunCommand } from 'gluegun'
import {
  configStore,
  describeError,
  Stash,
  StashProfile
} from '@cipherstash/stashjs'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

const command: GluegunCommand = {
  name: 'list-collections',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const profileName: string | undefined = parameters.options.profile

    try {
      let profile: StashProfile;
      if (profileName) {
        profile = await configStore.loadProfile(profileName)
      } else {
        profile = await configStore.loadDefaultProfile()
      }

      const stash = await Stash.connect(profile)
      const collectionNames = await stash.listCollections()
      console.log(collectionNames.join("\n"))
    } catch (error) {
      print.error(
        `Could not list collections. Reason: "${describeError(error)}"`
      )
    }
  }
}

export default command

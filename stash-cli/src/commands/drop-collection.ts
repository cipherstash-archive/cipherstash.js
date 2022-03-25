import { GluegunCommand } from 'gluegun'
import { Stash, describeError } from '@cipherstash/stashjs'
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
    }

    try {
      const profile = await Stash.loadProfile({ profileName }).catch(error => {
        print.error(`Could not load profile. Reason: "${describeError(error)}"`)
        process.exit(1)
      })

      const stash = await Stash.connect(profile)
      await stash.deleteCollection(collectionName)
      print.info(`Collection ${collectionName} removed.`)
    } catch (error) {
      print.error(`Could not drop collection ${collectionName}. Reason: "${describeError(error)}"`)
    }
  }
}

export default command

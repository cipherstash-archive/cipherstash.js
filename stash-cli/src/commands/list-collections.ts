import { GluegunCommand } from 'gluegun'
import { Stash, describeError } from '@cipherstash/stashjs'
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
      const profile = await Stash.loadProfile({ profileName });
      const stash = await Stash.connect(profile)
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

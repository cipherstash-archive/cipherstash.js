import { GluegunCommand } from 'gluegun'
import * as fs from 'fs'
import { Stash, StashProfile, profileStore, describeError, Result, errors } from '@cipherstash/stashjs'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

const command: GluegunCommand = {
  name: 'import',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const profileName: string | undefined = parameters.options.profile
    let profile: Result<StashProfile, errors.LoadProfileFailure>

    const collectionName: string | undefined = parameters.first

    if (collectionName === undefined) {
      print.error('No collection name specified.')
      process.exit(1)
    }

    const dataFile: string | undefined = parameters.options.data
    let data: Array<Object>

    if (dataFile === undefined) {
      print.error('No data file specified.')
      process.exit(1)
    }

    try {
      const dataBuffer = await fs.promises.readFile(dataFile)
      data = JSON.parse(dataBuffer.toString('utf8'))
    } catch (error) {
      print.error(`Could not load source data. Reason: "${error}"`)
      process.exit(1)
    }

    try {
      if (profileName) {
        profile = await profileStore.loadProfile(profileName)
      } else {
        profile = await profileStore.loadDefaultProfile()
      }

      if (!profile.ok) {
        print.error(`Could not load profile. Reason: "${describeError(profile.error)}"`)
        process.exit(1)
      }
    } catch (error) {
      print.error(`Could not load profile. Reason: "${describeError(error)}"`)
      process.exit(1)
    }

    try {
      const stash = await Stash.connect(profile.value)
      const collection = await stash.loadCollection(collectionName)

      const result = await collection.putStream(streamSources(data))
      print.info(`Imported ${result.numInserted} sources into the '${collectionName}' collection.`)
    } catch (error) {
      print.error(`Could not import sources. Reason: "${describeError(error)}"`)
    }
  }
}

export default command

async function* streamSources(sources: Array<Object>) {
  for (let s of sources) {
    yield s
  }
}

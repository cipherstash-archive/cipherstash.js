import { GluegunCommand } from 'gluegun'
import {
  MappingOn,
  Stash,
  StashProfile,
  StashRecord,
  profileStore,
  describeError,
  isDynamicMatchMapping,
  isExactMapping,
  isFieldDynamicMatchMapping,
  isMatchMapping,
  isRangeMapping,
  Result,
  errors
} from '@cipherstash/stashjs'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

const command: GluegunCommand = {
  name: 'list-collections',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const profileName: string | undefined = parameters.options.profile

    try {
      let profile: Result<StashProfile, errors.LoadProfileFailure>
      if (profileName) {
        profile = await profileStore.loadProfile(profileName)
      } else {
        profile = await profileStore.loadDefaultProfile()
      }

      if (!profile.ok) {
        print.error(`Could not list collections. Reason: "${describeError(profile.error)}"`)
        process.exit(1)
        return
      }

      const stash = await Stash.connect(profile.value)
      const collectionNames = await stash.listCollections()
      collectionNames.forEach(async collectionName => {
        const collection = await stash.loadCollection(collectionName)
        console.log(collectionName)
        Object.entries(collection.schema.mappings).forEach(([indexName, mapping]) => {
          console.log(
            `  Index: ${indexName}; Type: ${mapping.matcher} (supports ${describeOperators(
              mapping
            )}), Field(s): ${describeFields(mapping)}`
          )
        })
      })
    } catch (error) {
      print.error(`Could not list collections. Reason: "${describeError(error)}"`)
    }
  }
}

export default command

function describeFields(mapping: MappingOn<StashRecord>): string {
  if (isDynamicMatchMapping(mapping) || isFieldDynamicMatchMapping(mapping)) {
    return 'all string fields'
  }

  if (isMatchMapping(mapping)) {
    return mapping.fields.join(', ')
  }

  if (isRangeMapping(mapping) || isExactMapping(mapping)) {
    return mapping.field
  }

  throw new Error(`Unreachable: unknown index type ${JSON.stringify(mapping)}`)
}

function describeOperators(mapping: MappingOn<StashRecord>): string {
  if (isMatchMapping(mapping) || isDynamicMatchMapping(mapping) || isFieldDynamicMatchMapping(mapping)) {
    return '=~'
  }

  if (isRangeMapping(mapping)) {
    return '<, <=, =, >= >'
  }

  if (isExactMapping(mapping)) {
    return '='
  }

  throw new Error(`Unreachable: unknown index type ${JSON.stringify(mapping)}`)
}

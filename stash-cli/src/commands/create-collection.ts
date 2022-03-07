import { GluegunCommand } from 'gluegun'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'
import * as fs from 'fs'

import {
  StashInternal,
  CollectionSchema,
  typecheckCollectionSchemaDefinition,
  Mappings,
  StashProfile,
  describeError,
  profileStore,
  errors,
  StashRecord,
  Result,
  Err,
  Ok
} from '@cipherstash/stashjs'

const command: GluegunCommand = {
  name: 'create-collection',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox
    const options = parameters.options

    if (options.help) {
      print.info('Usage: stash create-collection <collection-name> [--profile <profile>] [--schema <schema>] [--help]')
      print.info('')
      print.info('Creates a collection in the workspace of the profile\n')
      print.info('See also https://docs.cipherstash.com/reference/stash-cli/stash-create-collection.html')
      print.info('')
      process.exit(0)
      return
    }

    if (!parameters.first) {
      print.error(`expected collection name`)
      process.exit(1)
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
      print.error(`Unexpected error while loading profile. Reason: "${describeError(error)}"`)
      process.exit(1)
      return
    }

    const connection = await StashInternal.connect(profile.value)
    if (!connection.ok) {
      print.error(`Authentication failed - please try to login again with "stash login"`)
      process.exit(1)
      return
    }
    const stash = connection.value
    const collectionName = parameters.first

    let schema = await (options.schema
      ? buildCollectionSchema(collectionName, options.schema)
      : Ok.Async(CollectionSchema.define(collectionName).notIndexed()))
    if (schema.ok) {
      const created = await stash.createCollection(schema.value)
      if (created.ok) {
        print.highlight(`The ${collectionName} collection has been created`)
        process.exit(0)
      } else {
        print.error(`Failed to create collection: ${JSON.stringify(created.error)}`)
        process.exit(1)
      }
    } else {
      print.error(`Failed to load schema from ${options.schema}: ${schema.error}`)
      process.exit(1)
    }
  }
}

function buildCollectionSchema(
  collectionName: string,
  schemaFile: string
): Result<CollectionSchema<StashRecord, Mappings<StashRecord>, any>, string> {
  if (fs.existsSync(schemaFile)) {
    let content: string
    try {
      content = fs.readFileSync(schemaFile, { encoding: 'utf8' })
    } catch (err) {
      return Err(
        `Failed to read schema from file ${schemaFile}. Please check the file exists and you have permissions to read it.`
      )
    }
    let schemaJSON
    try {
      schemaJSON = JSON.parse(content)
    } catch (err) {
      return Err(`Failed to parse schema JSON in ${schemaFile}. Please ensure the file is valid JSON.`)
    }
    const schemaDefinition = typecheckCollectionSchemaDefinition(schemaJSON)
    if (schemaDefinition.ok) {
      return Ok(CollectionSchema.define(collectionName).fromCollectionSchemeDefinition(schemaDefinition.value))
    } else {
      return Err(`Collection schema error: ${schemaDefinition.error}`)
    }
  } else {
    return Err(`Schema file ${schemaFile} does not exist`)
  }
}

export default command

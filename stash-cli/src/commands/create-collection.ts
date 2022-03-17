import { GluegunCommand } from 'gluegun'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'
import * as fs from 'fs'

import {
  StashInternal,
  CollectionSchema,
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
import { parseCollectionSchemaJSON } from '@cipherstash/stashjs/dist/parsers/collection-schema-parser'

function formatCollectionName(name: string): string {
  if (name.includes(' ')) {
    return `"${name}"`
  } else {
    return name
  }
}

const command: GluegunCommand = {
  name: 'create-collection',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox
    const options = parameters.options

    function exitWithUsage(): never {
      print.info(
        'Usage: stash create-collection <collection-name> [--profile <profile>] [--schema <schema>] [--no-schema] [--help]'
      )
      print.info('')
      print.info('Creates a collection in the workspace of the profile\n')
      print.info('See also https://docs.cipherstash.com/reference/stash-cli/stash-create-collection.html')
      print.info('')
      process.exit(0)
    }

    if (options.help) {
      exitWithUsage()
    }

    if (!parameters.array) {
      exitWithUsage()
    }

    const [collectionName, ...unexpectedParameters] = parameters.array

    if (unexpectedParameters.length > 0) {
      print.error(`Recieved more than one value for collection name. Did you mean to use quotes?`)
      print.error(`Example: stash create-collection "${collectionName} ${unexpectedParameters.join(' ')}"`)
      process.exit(1)
    }

    if (!collectionName) {
      print.error(`Expected a collection name`)
      print.error(`Example: stash create-collection movies`)
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
      }
    } catch (error) {
      print.error(`Unexpected error while loading profile. Reason: "${describeError(error)}"`)
      process.exit(1)
    }

    const connection = await StashInternal.connect(profile.value)
    if (!connection.ok) {
      print.error(`Authentication failed - please try to login again with "stash login"`)
      process.exit(1)
    }
    const stash = connection.value

    let schema: Result<CollectionSchema<StashRecord, Mappings<StashRecord>, any>, string>

    // The flag --no-schema is parsed as { schema: false } by gluegun - so explicity check for this
    if (options.schema === false) {
      schema = Ok(CollectionSchema.define(collectionName).notIndexed())
    } else if (options.schema) {
      schema = buildCollectionSchema(collectionName, options.schema)
    } else {
      print.error(`Expected either --schema or --no-schema flags.`)
      print.error('')
      print.error(`If you meant to create a collection without a schema, try passing the --no-schema flag.`)
      print.error(`Example: stash create-collection ${formatCollectionName(collectionName)} --no-schema`)
      process.exit(1)
    }

    if (schema.ok) {
      const created = await stash.createCollection(schema.value)
      if (created.ok) {
        print.highlight(`The ${formatCollectionName(collectionName)} collection has been created`)
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
    let schema = parseCollectionSchemaJSON(content)
    if (schema.ok) {
      return Ok(CollectionSchema.define(collectionName).fromCollectionSchemaDefinition(schema.value))
    } else {
      return Err(schema.error)
    }
  } else {
    return Err(`Schema file ${schemaFile} does not exist`)
  }
}

export default command

import { GluegunCommand } from "@cipherstash/gluegun"
import { Stash, describeError } from "@cipherstash/stashjs"
import { Toolbox } from "@cipherstash/gluegun/build/types/domain/toolbox"

const command: GluegunCommand = {
  name: "export-schema",

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const profileName: string | undefined = parameters.options.profile

    const profile = await Stash.loadProfile({ profileName }).catch(error => {
      print.error(`Could not load profile. Reason: "${describeError(error)}"`)
      process.exit(1)
    })

    function exitWithUsage(level: "info" | "error" = "info"): never {
      print[level]("Usage: stash export-schema <collection-name> [--profile <profile>] [--help]")
      print.newline()
      print[level]("Export the schema for the given collection.")
      print.newline()
      print[level]("Example: stash export-schema movies")
      process.exit(level === "info" ? 0 : 1)
    }

    if (parameters.options.help) {
      exitWithUsage()
    }

    try {
      const stash = await Stash.connect(profile)
      const collectionName = parameters.first

      if (collectionName === undefined) {
        print.error("No collection name specified.")
        print.newline()
        exitWithUsage("error")
      }


      const collection = await stash.loadCollection(collectionName)
      const indexes = {}

      Object.entries(collection.schema.mappings).forEach(([indexName, mapping]) => {
        const meta = {
          $prpKey: [...collection.schema.meta[indexName]!.$prpKey],
          $prfKey: [...collection.schema.meta[indexName]!.$prfKey],
          $indexId: collection.schema.meta[indexName]!.$indexId,
        }

        // Remove fieldType that's denormalized onto the mappings for internal use by the client
        const { fieldType, ...includedFields } = mapping

        indexes[indexName] = {
          ...includedFields,
          ...meta,
        }
      })

      const json = {
        name: collection.name,
        id: collection.id,
        type: collection.schema.recordType,
        ref: [...Buffer.from(collection.ref, "hex")],
        indexes,
        service: profile.config.service
      }

      // Console log instead of using `print.info` here so output can be redirected to a file.
      console.log(JSON.stringify(json, null, 2))
    } catch (error) {
      print.error(`Could not export schema. Reason: "${describeError(error)}"`)
    }
  },
}

export default command

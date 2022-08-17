import { GluegunCommand } from "gluegun"
import {
  MappingOn,
  Stash,
  StashRecord,
  describeError,
  isDynamicMatchMapping,
  isExactMapping,
  isFieldDynamicMatchMapping,
  isMatchMapping,
  isRangeMapping,
} from "@cipherstash/stashjs"
import { Toolbox } from "gluegun/build/types/domain/toolbox"

const command: GluegunCommand = {
  name: "describe-collection",

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const profileName: string | undefined = parameters.options.profile

    const profile = await Stash.loadProfile({ profileName }).catch(error => {
      print.error(`Could not load profile. Reason: "${describeError(error)}"`)
      process.exit(1)
    })

    function exitWithUsage(level: "info" | "error" = "info"): never {
      print[level](
        "Usage: stash describe-collection <collection-name> [--profile <profile>] [--include-meta] [--json] [--help]"
      )
      print.newline()
      print[level]("Display details on identifiers and indexes for the given collection.")
      print.newline()
      print[level]("Example: stash describe-collection movies")
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
      const mappings = {}

      Object.entries(collection.schema.mappings).forEach(([indexName, mapping]) => {
        const meta = parameters.options.includeMeta
          ? {
              $prpKey: collection.schema.meta[indexName]!.$prpKey.toString("hex"),
              $prfKey: collection.schema.meta[indexName]!.$prfKey.toString("hex"),
              $indexId: collection.schema.meta[indexName]!.$indexId,
            }
          : {}

        mappings[indexName] = {
          indexType: mapping.kind,
          fields: describeFields(mapping),
          operators: describeOperators(mapping),
          ...meta,
        }
      })

      if (parameters.options.json) {
        const json = {
          id: collection.id,
          name: collection.name,
          ref: collection.ref,
          mappings,
        }
        print.info(JSON.stringify(json, null, 2))
      } else {
        print.highlight(" Identifiers:")
        print.table(
          [
            ["ID", collection.id],
            ["Name", collection.name],
            ["Ref (hex encoded)", collection.ref],
          ],
          { format: "lean" }
        )

        const metaHeaders = parameters.options.includeMeta
          ? ["Index ID", "PRP Key (hex encoded)", "PRF Key (hex encoded)"]
          : []

        const tbl = [["Index Name", "Index Type", "Field(s)", "Query Operators", ...metaHeaders]]

        for (const k in mappings) {
          const metaFields = parameters.options.includeMeta
            ? [mappings[k].$indexId, mappings[k].$prpKey, mappings[k].$prfKey]
            : []

          tbl.push([k, mappings[k].indexType, mappings[k].fields, mappings[k].operators, ...metaFields])
        }

        print.newline()
        print.highlight(" Indexes:")
        print.table(tbl, { format: "lean" })
      }
    } catch (error) {
      print.error(`Could not list collections. Reason: "${describeError(error)}"`)
    }
  },
}

export default command

function describeFields(mapping: MappingOn<StashRecord>): string {
  if (isDynamicMatchMapping(mapping) || isFieldDynamicMatchMapping(mapping)) {
    return "all string fields"
  }

  if (isMatchMapping(mapping)) {
    return mapping.fields.join(", ")
  }

  if (isRangeMapping(mapping) || isExactMapping(mapping)) {
    return mapping.field
  }

  throw new Error(`Unreachable: unknown index type ${JSON.stringify(mapping)}`)
}

function describeOperators(mapping: MappingOn<StashRecord>): string {
  if (isMatchMapping(mapping) || isDynamicMatchMapping(mapping) || isFieldDynamicMatchMapping(mapping)) {
    return "=~"
  }

  if (isRangeMapping(mapping)) {
    return "<, <=, =, >= >"
  }

  if (isExactMapping(mapping)) {
    return "="
  }

  throw new Error(`Unreachable: unknown index type ${JSON.stringify(mapping)}`)
}

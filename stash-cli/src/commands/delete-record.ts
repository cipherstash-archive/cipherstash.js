import { GluegunCommand } from "gluegun"
import { Stash, describeError } from "@cipherstash/stashjs"
import { Toolbox } from "gluegun/build/types/domain/toolbox"
import { withDefaultErrorHandling } from "../with-default-error-handling"

const command: GluegunCommand = {
  name: "delete-record",

  run: withDefaultErrorHandling(async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox
    const { options } = parameters

    function exitWithUsage(level: "info" | "error" = "info"): never {
      print[level]("Usage: stash delete-record <collection-name> <comma separated ids> [--profile <profile>] [--help]")
      print.newline()
      print[level]("Deletes records by id for a certain collection from a comma separated list.")
      print.newline()
      print[level]("Example: stash delete-record movies first,second,third")
      process.exit(level === "info" ? 0 : 1)
    }

    if (options.help || !parameters.array) {
      exitWithUsage()
    }

    const profileName: string | undefined = options.profile

    const [collectionName, recordList, ...unexpected] = parameters.array

    if (!collectionName) {
      exitWithUsage()
    }

    if (unexpected.length > 0) {
      print.error("Received too many arguments. Did you mean to pass them in a comma separated list?")
      print.error(`Example: stash delete-record "${collectionName}" "${recordList},${unexpected.join(",")}"`)
      process.exit(1)
    }

    const recordIds = (recordList || "").split(",").filter(x => !!x)

    if (recordIds.length <= 0) {
      print.error("Recieved no record ids. Did you mean to pass them in a comma separated list?")
      print.newline()
      exitWithUsage("error")
    }

    const profile = await Stash.loadProfile({ profileName })

    const stash = await Stash.connect(profile)
    const collection = await stash.loadCollection(collectionName)

    const recordCounter = recordIds.length > 1 ? "records" : "record"

    print.info(`Deleting ${recordIds.length} ${recordCounter}.`)
    print.newline()

    const failed: string[] = []

    for (const id of recordIds) {
      print.info(`Deleting record "${id}"`)
      print.newline()

      try {
        await collection.delete(id)
      } catch (error) {
        print.error(`Failed to delete record "${id}"`)
        print.error(describeError(error))
        print.newline()

        failed.push(id)
      }
    }

    if (failed.length > 0) {
      print.error(`Failed to delete ${failed.length}/${recordIds.length} ${recordCounter}.`)
      process.exit(1)
    } else {
      print.info(`Successfully deleted ${recordIds.length} ${recordCounter}.`)
    }
  }),
}

export default command

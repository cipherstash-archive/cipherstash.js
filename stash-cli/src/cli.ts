import { build } from "gluegun"

/**
 * Create the cli and kick it off
 */
async function run(argv: string | Record<string, unknown>) {
  // create a CLI runtime
  const cli = build()
    .brand("stash")
    .src(__dirname)
    .plugins("./node_modules", { matching: "stash-*", hidden: true })
    .help() // provides default for help, h, --help, -h
    .version() // provides default for version, v, --version, -v
    .defaultCommand()
    .create()

  const toolbox = await cli.run(argv)

  // send it back (for testing, mostly)
  return toolbox
}

module.exports = { run }

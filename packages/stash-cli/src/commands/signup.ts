import { GluegunCommand } from "@cipherstash/gluegun"
import { Toolbox } from "@cipherstash/gluegun/build/types/domain/toolbox"

import open from "open"

const command: GluegunCommand = {
  name: "signup",
  description: "Signup to CipherStash",
  alias: "s",

  run: async (toolbox: Toolbox) => {
    const { print, parameters, meta } = toolbox
    const options = parameters.options

    if (options.help) {
      printHelp(toolbox)
      process.exit(0)
    }

    const version = meta.version()
    const redirectURL = `https://cipherstash.com/signup/stash-cli?v=${version}`

    print.info("")
    print.info("")
    print.info("")
    print.info("")
    print.info("")
    print.info(`You are being redirected to ${redirectURL} to complete your signup.`)
    print.info("")
    print.info("")
    print.info("NEXT STEPS:")
    print.info("")
    print.info("1. Sign up with your GitHub account or email.")
    print.info("")
    print.info("")
    print.info("2. Grab your workspace ID from the signup confirmation page")
    print.info("")
    print.info("")
    print.info(
      "3. Log in using this stash command with your workspace ID: stash login --region <your workspace region> --workspace <your workspace id>"
    )
    print.info("")
    print.info("")
    print.info("")
    print.info("")
    print.info("")
    print.info("")
    open(redirectURL)
    print.info("")
    print.info("")
  },
}

function printHelp(toolbox: Toolbox): void {
  const { print } = toolbox

  print.info("Usage: stash signup [--help]")
  print.info("")
  print.info("Signup to CipherStash\n")
  print.info("")
  print.info("    stash signup")
  print.info("")
}

export default command

#!/usr/bin/env bash

# This script publishes our TS/JS packages to NPM.
# You'll need to set up an account on npmjs.com and be added to the @cipherstash organisation,
# then create an ~/.npmrc file with the following content:

# //registry.npmjs.org/:_authToken=<your npmjs.com auth token>
# engine-strict=true

set -e # exit when a command fails
set -u # exit when script tries to use undeclared variables
set -x # trace what gets executed (useful for debugging)

pnpm publish -r
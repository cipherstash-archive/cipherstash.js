#!/usr/bin/env bash

# The script builds & tests all of the pnpm-managed @cipherstash projects.

# This script is written using the bash script best practices (see:
# https://kvz.io/bash-best-practices.html)

set -e # exit when a command fails
set -u # exit when script tries to use undeclared variables
set -x # trace what gets executed (useful for debugging)

trap "echo SOMETHING WENT WRONG - please read the logs above and see if it helps you figure out what is wrong - and also ask an engineer help" ERR

subproject_setup() {
  pnpm install .
}

subproject_build() {
  pnpx typedoc --entryPointStrategy packages ../stashjs-grpc ../stashjs \
    --out tsdoc \
    --disableSources \
    --readme none

  # The typedoc index.html file doesn't work from a subfolder.
  sed -i 's/<head>/<head><base href="\/tsdoc\/">/g' ./tsdoc/index.html
}

subproject_test() {
  true
}

subproject_clean() {
  rm ./docs -rf
}

subproject_rebuild() {
  subproject_clean
  subproject_build
}

subcommand="${1:-build}"
case $subcommand in
  setup)
    subproject_setup
    ;;

  clean)
    subproject_clean
    ;;

  test)
    subproject_test
    ;;

  rebuild)
    subproject_rebuild
    ;;

  build)
    subproject_build
    ;;

  *)
    echo "Unknown build subcommand '$subcommand'"
    exit 1
    ;;
esac

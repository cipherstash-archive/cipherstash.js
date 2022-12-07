#!/usr/bin/env bash

# The script builds & tests all of the pnpm-managed @cipherstash projects.

# This script is written using the bash script best practices (see:
# https://kvz.io/bash-best-practices.html)

set -e # exit when a command fails
set -u # exit when script tries to use undeclared variables
if [[ -n "${DEBUG_BUILD_SH:-}" ]]; then
  set -x # trace what gets executed (useful for debugging)
fi

trap "echo SOMETHING WENT WRONG - please read the logs above and see if it helps you figure out what is wrong - and also ask an engineer help" ERR

subproject_setup() {
  pnpm install
}

subproject_build() {
  pnpm build
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

subproject_release() {
  if [ -z "${VERCEL_TOKEN:-}" ]; then
    echo "error: missing environment variable VERCEL_TOKEN"
    exit 1
  fi
  if [ -z "${VERCEL_PROJECT_ID:-}" ]; then
    echo "error: missing environment variable VERCEL_PROJECT_ID"
    exit 1
  fi
  if [ -z "${VERCEL_ORG_ID:-}" ]; then
    echo "error: missing environment variable VERCEL_ORG_ID"
    exit 1
  fi

  prodRun=""
  if [ "${GITHUB_REF:-}" == "refs/heads/main" ]; then
    prodRun="--prod"
  fi

  # The typedoc index.html file doesn't work from a subfolder.
  sed -i '' -e 's/<head>/<head><base href="\/tsdoc\/">/g' ./build/tsdoc/index.html

  pnpm vercel --token "${VERCEL_TOKEN}" $prodRun deploy build
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

  release)
    subproject_release
    ;;

  *)
    echo "Unknown build subcommand '$subcommand'"
    exit 1
    ;;
esac

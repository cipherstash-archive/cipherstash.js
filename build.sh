#!/usr/bin/env bash

# The script builds & tests all of the pnpm-managed @cipherstash projects.

# This script is written using the bash script best practices (see:
# https://kvz.io/bash-best-practices.html)

set -e # exit when a command fails
set -u # exit when script tries to use undeclared variables
set -x # trace what gets executed (useful for debugging)

trap "echo SOMETHING WENT WRONG - please read the logs above and see if it helps you figure out what is wrong - and also ask an engineer help" ERR

subproject_setup() {
  asdf install
  asdf reshim
  pnpm install --frozen-lockfile
}

subproject_build() {
  pnpm install --frozen-lockfile --filter @cipherstash/*
  pnpm build --filter @cipherstash/*
}

subproject_test() {
  find "$(dirname "${0}")" -name '*.sh' -exec shellcheck {} +
  find "$(dirname "${0}")" -name '*.sh' -exec shfmt -ci -i 2 -d {} +
  pnpm test --filter @cipherstash/*
}

subproject_publish() {
  pnpm build --filter @cipherstash/*
  pnpm publish --filter @cipherstash/*
}

subproject_clean() {
  pnpm run clean --filter @cipherstash/*
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

  publish)
    subproject_publish
    ;;

  *)
    echo "Unknown build subcommand '$subcommand'"
    exit 1
    ;;
esac

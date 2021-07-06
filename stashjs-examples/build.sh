#!/usr/bin/env bash

# This script builds everything in the platform repo. It is written using the
# bash script best practices (see: https://kvz.io/bash-best-practices.html)

set -e # exit when a command fails
set -u # exit when script tries to use undeclared variables
set -x # trace what gets executed (useful for debugging)


subproject_setup() {
  asdf install
  asdf reshim
}

subproject_build() {
  pnpm install
  pnpm build
}

subproject_test() {
  shellcheck "${0}"
}

subproject_clean() {
  rm -fr ./dist/*
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





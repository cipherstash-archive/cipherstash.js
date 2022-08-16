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
  asdf install
  asdf reshim
  pnpm install --frozen-lockfile
}

subproject_build() {
  pnpm install --frozen-lockfile
  pnpm --recursive --filter "!./packages/stash-typedoc" build
  # Build stash-typedoc last because it depends on the other packages already being built
  pnpm --filter "./packages/stash-typedoc" build
}

subproject_lint() {
  find "$(dirname "${0}")" -name node_modules -prune -o -name '*.sh' -exec shfmt -w -ci -i 2 -d {} +
  find "$(dirname "${0}")" -name node_modules -prune -o -name '*.sh' -exec shellcheck {} +
  pnpm -r lint:fix
}

subproject_test() {
  find "$(dirname "${0}")" -name node_modules -prune -o -name '*.sh' -exec shfmt -ci -i 2 -d {} +
  find "$(dirname "${0}")" -name node_modules -prune -o -name '*.sh' -exec shellcheck {} +
  pnpm -r lint
  pnpm -r test
}

subproject_publish() {
  pnpm -r build
  pnpm -r publish
}

subproject_clean() {
  pnpm -r clean
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

  lint)
    subproject_lint
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

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

setup() {
  asdf plugin add postgres || true
  asdf plugin add protoc || true
  asdf plugin add rust || true
  asdf plugin add nodejs || true
  asdf plugin add pnpm || true
  asdf plugin add shellcheck || true
  asdf plugin add shfmt || true

  asdf install
  asdf reshim

  # Install wasm for @cipherstash/stash-rs
  rustup target add wasm32-unknown-unknown

  pnpm install --frozen-lockfile
}

build() {
  pnpm install --frozen-lockfile
  pnpm -r build
}

lint() {
  find "$(dirname "${0}")" -name node_modules -prune -o -name '*.sh' -exec shfmt -w -ci -i 2 -d {} +
  find "$(dirname "${0}")" -name node_modules -prune -o -name '*.sh' -exec shellcheck {} +
  pnpm -r lint:fix
}

test() {
  find "$(dirname "${0}")" -name node_modules -prune -o -name '*.sh' -exec shfmt -ci -i 2 -d {} +
  find "$(dirname "${0}")" -name node_modules -prune -o -name '*.sh' -exec shellcheck {} +
  pnpm -r lint
  pnpm -r test
}

publish() {
  pnpm -r build
  pnpm -r publish
}

clean() {
  pnpm -r clean
}

rebuild() {
  clean
  build
}

subcommand="${1:-build}"
case $subcommand in
  setup)
    setup
    ;;

  clean)
    clean
    ;;

  test)
    test
    ;;

  lint)
    lint
    ;;

  rebuild)
    rebuild
    ;;

  build)
    build
    ;;

  publish)
    publish
    ;;

  *)
    echo "Unknown build subcommand '$subcommand'"
    exit 1
    ;;
esac

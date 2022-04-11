#!/usr/bin/env bash

# This script updates the public Github repositories the packages in this dir.

set -e # exit when a command fails
set -u # exit when script tries to use undeclared variables
set -x # trace what gets executed (useful for debugging)

platform_root=$(git rev-parse --show-toplevel)

for package in stashjs-grpc stashjs stash-cli; do
  remote=$(node -e "console.log(require('./$package/package.json').repository.url)" | sed 's/^git\+//')
  echo "Remote: $remote"
  (cd "$platform_root" && git subtree -d push --prefix="clients/@cipherstash/$package" "$remote" main)
done

#!/usr/bin/env bash

# This script builds everything in the platform repo. It is written using the
# bash script best practices (see: https://kvz.io/bash-best-practices.html)

set -e # exit when a command fails
set -u # exit when script tries to use undeclared variables
set -x # trace what gets executed (useful for debugging)

if [ -d ./src/crypto/ore/fastore ]; then
  rm -fr ./dist
  node-gyp configure
  node-gyp build
  cp src/crypto/ore/napi_ore.d.ts build/Release/
fi
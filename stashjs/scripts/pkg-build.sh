#!/usr/bin/env bash

# This script builds everything in the platform repo. It is written using the
# bash script best practices (see: https://kvz.io/bash-best-practices.html)

set -e # exit when a command fails
set -u # exit when script tries to use undeclared variables
set -x # trace what gets executed (useful for debugging)

trap "echo SOMETHING WENT WRONG - please read the logs above and see if it helps you figure out what's wrong - and also ask an engineer help :)" ERR

rm -fr ./dist ./src/crypto/ore/fastore/*
mkdir -p ./src/crypto/ore/fastore
cp -R ../../../fastore/* ./src/crypto/ore/fastore
node-gyp configure && node-gyp build
cp src/crypto/ore/napi_ore.d.ts build/Release/
pnpx tsc

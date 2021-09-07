#!/usr/bin/env bash

# This script builds everything in the platform repo. It is written using the
# bash script best practices (see: https://kvz.io/bash-best-practices.html)

set -e # exit when a command fails
set -u # exit when script tries to use undeclared variables
set -x # trace what gets executed (useful for debugging)

trap "echo SOMETHING WENT WRONG - please read the logs above and see if it helps you figure out what is wrong - and also ask an engineer help" ERR

rm -fr ./grpc ./dist ./generated
mkdir -p ./grpc ./dist ./generated
cp -R ../../../data-service/priv/grpc/* ./grpc
proto-loader-gen-types api.proto --outDir=generated --grpcLib=@grpc/grpc-js \
  --includeDirs grpc/v1 --keepCase=true --longs=number --enums=string \
  --defaults=true --oneofs==true
pnpx tsc
cp -RL grpc dist


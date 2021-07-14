#!/usr/bin/env bash

# This script builds everything in the platform repo. It is written using the
# bash script best practices (see: https://kvz.io/bash-best-practices.html)

set -e # exit when a command fails
set -u # exit when script tries to use undeclared variables
set -x # trace what gets executed (useful for debugging)

 rm -fr ./dist
 rm -fr ./grpc
 mkdir ./grpc
 cp -R ../../../data-service/priv/grpc/* ./grpc
 proto-loader-gen-types api.proto --outDir=generated --grpcLib=@grpc/grpc-js \
    --includeDirs grpc/v1 --keepCase=true --longs=number --enums=string \
    --defaults=true --oneofs==true
pnpx tsc
cp -RL grpc dist
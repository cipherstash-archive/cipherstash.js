#!/usr/bin/env bash

set -e

# Update the snippet to use Node.js compatible JS.
sed -i '' -e 's/export function bytes_literal() { return "bytes"; }/module.exports = { bytes_literal() { return "bytes"; } }/g' ./pkg/snippets/wasm-streams-42e57edbcd526312/inline0.js

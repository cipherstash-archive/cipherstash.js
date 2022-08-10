# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## Added

- Added ID, name, and ref to describe-collection output. This a breaking change for the output format when the `--json` flag is provided.

## Changed

- Upgrade axios to 0.27.2

## [0.3.13]

## Changed

- Bumped StashJS version

## [0.3.12]

## Changed

- Remove stash-cli as a dependancy of itself

## [0.3.11]

## Added

- Access key create list and revoke commands

## Changed

- Update error reporting
- Bump axios to 0.26.1

## [0.3.10]

## Changed

- Bumped StashJS version

## [0.3.9]

## Changed

- Bumped StashJS version

## [0.3.8]

## Changed

- Launch node with --stack-trace-limit=1024 so that stack traces are not truncated

## [0.3.7]

## Added

- Add `delete-record` command for deleting records in a collection by id
- Add default command so mistyped commands show something helpful

## [0.3.6]

## Changed

- Passing `--no-schema` is now required when creating a collection without a schema

## [0.3.4]

## Changed

- when creating a new profile, if --profile is not specified, use the name "default".
- if the name of a new profile clashes with the name of a saved profile, omly allow the write if and only if the workspace IDs are identical

## Fixed

- collection name is a positional argument in create-collection command. Update help & error message to reflect that
- schema parsing and validation are now performed in one atomic step

## Added

- Ability to import sources from a file in a JSON array via `stash import`
- Added `create-collection` command
- Documentation for installing stash-cli, with pointers to more documentation

## [0.3.1]

## Added

- Ability to drop a collection via `stash drop-collection`

## [0.3.0]

## Added

- Ability to list collections via `stash list-collections`
- Ability to describe a collection via `stash describe-collection`
- Ability to log in to a workspace via `stash login`
- Profile based configuration. See [docs](https://docs.cipherstash.com/reference/client-configuration.html)

## Changed

- Uses stashjs 0.3.0
- Version numbering aligned with stashjs

# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

##Fixed 

- Schema parsing and validation are now performed in one atomic step

## Changed

- StashJS now requires NodeJS version >= 16

## [0.3.0]

## Added

- Introduce new configuration profile storage
- Export additional type guard so that they can be used in StashCLI
- Make Stash.listCollections() also return collection metadata

## Changed

- Stash.connect() without arguments will now load configuration from the default profile
- ORE now provided by [ore.rs](https://github.com/cipherstash/ore.rs) via [Node
  ore.rs](https://github.com/cipherstash/node-ore-rs)
- Lots of error handling improvements

## Fixed

- Handle refreshing of federated AWS credentials
- Handle refreshing of device token auth credentials
- Multiple minor bug fixes

## [0.2.35]

### Fixed

- Export symbols from stashjs that were accidentally omitted

### Added

- New env var CS_AWS_FEDERATE (defaults to ON, when OFF AWS client ID & secret must be provided in env)

## [0.2.34]

### Fixed

- Ignore undefined field values during analysis instead of throwing exception

## [0.2.33]

### Added

- Authentication now possible via stored token using stash-cli

### Changed

- No longer uses AWS Cognito to exchange tokens (uses STS AssumeRoleWithWebIdentity now instead)

## [0.2.32]

### Added

- Streaming inserts

## [0.2.31]

### Changed

- Credentials now sent via gRPC header
- Removed RequestContext from gRPC protocol definitions

## [0.2.30]

### Fixed

- Authentication and token federation improvements and minor fixes

## [0.2.29]

### Changed
- Treat all document IDs as UUIDs

## [0.2.28]

- Deprecated due to erroneously publishing with npm instead of pnpm

## [0.2.27]

### Fixed
- Updated to use correct stashjs-grpc protocol files

## [0.2.26]

- Deprecated due to incorrect stashjs-grpc dependency

## [0.2.25]

### Added
- Queries can now be performed with no constraints (to retrieve all records)
- Added getAll function to retrieve several records at once by their ID

### Fixed
- Ordering by a particular field now works correctly
- Limits are now applied correctly

### Changed
- The default query limit is now set to 50

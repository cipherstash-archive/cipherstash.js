# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

* Ability to count query result size
* Ability to skip returning of results if only aggregates are required

### Changed

* Changed from Buffer#writeUint32BE to Buffer#writeUInt32BE to improve support across Node versions

### Fixed
* [#190] Stash#createCollection now returns a usesable Collection object

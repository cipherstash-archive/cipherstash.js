# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Queries can now be performed with no constraints (to retrieve all records)
- Added getAll function to retrieve several records at once by their ID

### Fixed
- Ordering by a particular field now works correctly
- Limits are now applied correctly

### Changed
- The default query limit is now set to 50

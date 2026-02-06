# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.4.0] - 2026-02-06

### Added
- Add check to skip non-numeric IENs in LISTPAT function
- add Docker Compose setup for testing and enhance Rust service dependencies

### Changed
- migrate client-app and rustyvault-ui to shared LoginForm component
- replace yottadbApiClient with apiClient for consistency across EHR hooks
- update .gitignore files to remove obsolete entries and add TanStack Router generated files
- update API routes and enhance Select component
- Remove duplicate code from frontend (part 1)
- Remove duplicate code from backend

### Documentation
- Update refactoring summary with completed work

### Maintenance
- add strict error handling files and update configuration

### Other
- Refactor: Consolidate EHR types and remove unused patient and user types
- Add M Web Server and VistA FileMan REST API

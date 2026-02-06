# Version and Release Management Skill

Manage version bumps, releases, and changelog generation for the Health V1 monorepo.

## What This Skill Does

1. Checks current version status across all packages
2. Validates version sync before releases
3. Guides through version bump process
4. Generates changelog entries from commits
5. Creates release commits and tags

## Version Architecture

```
/VERSION                         ← Single source of truth
├── cli/package.json             ← Synced
├── cli/packages/apps/*/package.json  ← Synced
├── cli/packages/libs/*/package.json  ← Synced
├── backend/Cargo.toml           ← Synced ([workspace.package])
├── sonar-project.properties     ← Synced (projectVersion)
└── Git tag                      ← Created on release (v1.2.0)
```

## Semantic Versioning

This project follows [SemVer 2.0.0](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
  - API contract changes
  - Database schema breaking changes
  - Removed features

- **MINOR** (0.X.0): New features (backwards compatible)
  - New API endpoints
  - New components
  - New functionality

- **PATCH** (0.0.X): Bug fixes (backwards compatible)
  - Bug fixes
  - Security patches
  - Documentation updates

## Execution Steps

### Step 1: Check Current Version

```bash
# View current version
cat VERSION

# Check if all packages are in sync
make version-check
# or
./scripts/bump-version.sh --check
```

Expected output:
```
Expected version: 1.2.0

✓ cli/package.json: 1.2.0
✓ cli/packages/apps/admin/package.json: 1.2.0
✓ cli/packages/apps/client-app/package.json: 1.2.0
✓ cli/packages/apps/rustyvault-ui/package.json: 1.2.0
✓ cli/packages/libs/shared/package.json: 1.2.0
✓ cli/packages/libs/components/package.json: 1.2.0
✓ backend/Cargo.toml: 1.2.0
✓ sonar-project.properties: 1.2.0

✓ All versions match!
```

### Step 2: Sync Versions (if needed)

If versions are out of sync:

```bash
make version-sync
# or
./scripts/bump-version.sh
```

### Step 3: Preview Release

Before releasing, preview changes:

```bash
# Preview patch release
make release-dry-run TYPE=patch

# Preview minor release
./scripts/release.sh --dry-run minor
```

This shows:
- Version change (e.g., 1.2.0 -> 1.2.1)
- Files that will be updated
- Changelog entry that will be generated
- Commit message preview

### Step 4: Create Release

Choose release type based on changes:

```bash
# Patch release (bug fixes)
make release-patch

# Minor release (new features)
make release-minor

# Major release (breaking changes)
make release-major
```

The release script will:
1. Bump VERSION file
2. Sync all package versions
3. Generate CHANGELOG.md entry
4. Create commit: `chore(release): v1.2.1`
5. Create git tag: `v1.2.1`

### Step 5: Push Release

After release is created locally:

```bash
# Push commits and tags
git push origin main
git push origin v1.2.1

# Or push all tags
git push origin --tags
```

This triggers:
- GitHub Actions release workflow
- Docker image builds
- GitHub Release creation

## Changelog Format

CHANGELOG.md follows [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [1.2.1] - 2026-02-06

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Change description

### Security
- Security fix description

### Deprecated
- Deprecated feature

### Removed
- Removed feature
```

Categories are auto-populated from conventional commits:
- `feat:` → Added
- `fix:` → Fixed
- `refactor:` → Changed
- `security:` → Security
- `perf:` → Performance
- `docs:` → Documentation

## Pre-Release Checklist

Before any release:

```
PRE-RELEASE CHECKLIST
=====================
□ All tests passing: make test
□ No linting errors: make lint
□ Type check passes: make check-types
□ Versions in sync: make version-check
□ On main/master branch
□ Working directory clean
□ Recent changes documented
```

## Database Migration Versioning

Link migrations to releases in CHANGELOG:

```markdown
## [1.2.1] - 2026-02-06

### Database
- Migration 0086: Add patient_preferences table
- Migration 0087: Create index on audit_logs
```

Migrations are in: `backend/migrations/NNNN_description.up.sql`

## API Versioning

Current API versioning:
- `/v1/` - Current stable API
- Routes defined in: `cli/packages/libs/shared/src/api/routes.ts`

For breaking API changes:
1. Create `/v2/` endpoints
2. Deprecate `/v1/` (don't remove immediately)
3. Document migration path in CHANGELOG
4. Bump MAJOR version

## Troubleshooting

### Versions Out of Sync
```bash
# Check what's different
./scripts/bump-version.sh --check

# Sync to VERSION file
./scripts/bump-version.sh
```

### Release Failed Mid-Way
```bash
# Check current state
git status
git log --oneline -3

# If commit exists but no tag:
git tag -a v1.2.1 -m "Release v1.2.1"

# If need to redo:
git reset --soft HEAD~1
./scripts/release.sh patch
```

### Tag Already Exists
```bash
# Delete local tag
git tag -d v1.2.1

# Delete remote tag (careful!)
git push origin :refs/tags/v1.2.1
```

## Output Format

When using this skill, provide:

```
VERSION STATUS REPORT
=====================
Current Version: [version]
Last Release: [tag] ([date])

PACKAGE VERSIONS:
[table of package versions]

COMMITS SINCE LAST RELEASE:
- [commit type]: [description]
- ...

RECOMMENDED RELEASE TYPE: [patch/minor/major]
REASON: [explanation]

NEXT STEPS:
1. [action item]
2. [action item]
```

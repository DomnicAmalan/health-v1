# SonarQube Learn and Fix Skill

Analyze SonarQube findings, learn from code quality issues, and apply fixes systematically.

## What This Skill Does

1. Runs SonarQube analysis or reads existing reports
2. Categorizes issues by severity and type
3. Explains each issue with learning context
4. Proposes and applies fixes following project conventions
5. Validates fixes don't introduce regressions

## Prerequisites

- SonarQube server running: `make docker-dev` (includes SonarQube)
- Scanner configured in `sonar-project.properties`
- Token available in `SONAR_TOKEN` environment variable

## Execution Steps

### Step 1: Check SonarQube Status

```bash
# Check if SonarQube is running
curl -s "http://localhost:9000/api/system/status" | jq .
```

If not running:
```bash
make sonar-up
# Wait 2 minutes for initialization
```

### Step 2: Run Analysis

Run fresh analysis to get latest issues:
```bash
make sonar
```

Or scan only (skip tests):
```bash
make sonar-scan
```

### Step 3: Fetch Issues

Use SonarQube API to get issues:

```bash
# Get all issues for the project
curl -s -u "$SONAR_TOKEN:" \
  "http://localhost:9000/api/issues/search?componentKeys=health-v1&ps=500" \
  | jq '.issues[] | {key, severity, type, message, component, line}'
```

Issue types to prioritize:
1. **BUG** - Reliability issues (fix first)
2. **VULNERABILITY** - Security issues (fix immediately)
3. **CODE_SMELL** - Maintainability issues (batch fix)
4. **SECURITY_HOTSPOT** - Requires security review

### Step 4: Categorize and Explain

For each issue, provide:

1. **Issue Description**: What SonarQube detected
2. **Why It Matters**: Impact on reliability/security/maintainability
3. **Learning Context**: Best practice being violated
4. **Fix Strategy**: How to resolve properly

Example output:
```
ISSUE: S1172 - Unused function parameter 'config' in handleRequest
FILE: backend/api-service/src/handlers/auth.rs:45
SEVERITY: Minor (Code Smell)

WHY IT MATTERS:
- Unused parameters add cognitive overhead
- May indicate incomplete implementation
- Makes API contracts unclear

LEARNING:
In Rust, prefix unused parameters with underscore: _config
This tells compiler and readers the parameter is intentionally unused.

FIX:
- fn handleRequest(config: &Config) -> Result<Response>
+ fn handleRequest(_config: &Config) -> Result<Response>

Or if truly unnecessary, remove from function signature.
```

### Step 5: Apply Fixes

Apply fixes in order of severity:

1. **Critical/Blocker** - Security vulnerabilities, potential crashes
2. **Major** - Bugs, performance issues
3. **Minor** - Code smells, style issues
4. **Info** - Documentation, minor improvements

For each fix:
1. Read the affected file
2. Understand the context
3. Apply minimal fix following project conventions
4. Run tests to validate

### Step 6: Verify Fixes

After applying fixes:

```bash
# Run tests
make test

# Re-run SonarQube scan
make sonar-scan

# Check if issues are resolved
curl -s -u "$SONAR_TOKEN:" \
  "http://localhost:9000/api/issues/search?componentKeys=health-v1&resolved=false&ps=100" \
  | jq '.total'
```

## Common Issue Categories

### TypeScript/React (Biome/OXC)

| Rule | Description | Fix Pattern |
|------|-------------|-------------|
| `noUnusedVariables` | Unused variable | Remove or prefix with `_` |
| `noExplicitAny` | Using `any` type | Add proper type |
| `useConst` | `let` where `const` works | Change to `const` |
| `noNonNullAssertion` | Using `!` | Add null check |

### Rust (Clippy)

| Rule | Description | Fix Pattern |
|------|-------------|-------------|
| `clippy::unwrap_used` | Using `unwrap()` | Use `?` or `ok_or()` |
| `clippy::expect_used` | Using `expect()` | Use `?` with context |
| `clippy::todo` | TODO! macro | Implement or remove |
| `clippy::redundant_clone` | Unnecessary clone | Remove `.clone()` |

## Output Format

```
SONARQUBE ANALYSIS REPORT
=========================
Project: health-v1
Date: [current date]
Total Issues: [count]

BY SEVERITY:
- Blocker: [count]
- Critical: [count]
- Major: [count]
- Minor: [count]
- Info: [count]

BY TYPE:
- Bugs: [count]
- Vulnerabilities: [count]
- Code Smells: [count]
- Security Hotspots: [count]

FIXES APPLIED:
1. [file:line] - [issue description] - [fix applied]
2. ...

REMAINING ISSUES:
1. [file:line] - [issue] - [reason not fixed]
2. ...

RECOMMENDATIONS:
- [Additional improvements based on patterns]
```

## Integration with CI

SonarQube gates are checked in `.github/workflows/test-coverage.yml`.
Failed gates will block PR merges.

Quality Gate thresholds:
- Coverage: > 80%
- Duplications: < 3%
- Maintainability Rating: A
- Reliability Rating: A
- Security Rating: A

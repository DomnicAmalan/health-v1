# PHI Security Scan Skill

Scan codebase for potential PHI (Protected Health Information) exposure, security vulnerabilities, and data leaks.

## What This Skill Does

1. Scans for hardcoded PHI or test data with real patterns
2. Checks for PHI in logs, console output, or error messages
3. Verifies PHI is not exposed in URLs or query parameters
4. Identifies unmasked PHI in state management
5. Reviews API responses for PHI leakage

## Scan Commands

### Scan 1: Console Logging
```bash
# Find console.log statements that might log PHI
grep -rn "console\.\(log\|warn\|error\|info\)" cli/packages/apps/ --include="*.ts" --include="*.tsx" | grep -iE "(patient|ssn|email|phone|mrn|dob|birth|address)"
```

### Scan 2: Hardcoded SSN Patterns
```bash
# Find potential SSN patterns (XXX-XX-XXXX)
grep -rn "[0-9]\{3\}-[0-9]\{2\}-[0-9]\{4\}" cli/packages/ --include="*.ts" --include="*.tsx" --include="*.json"
```

### Scan 3: Email in Test Data
```bash
# Find hardcoded emails that might be real
grep -rn "@[a-z]*\.\(com\|org\|net\|edu\)" cli/packages/ --include="*.ts" --include="*.tsx" | grep -v "example\|test\|mock\|fake"
```

### Scan 4: Phone Numbers
```bash
# Find potential phone number patterns
grep -rn "[0-9]\{3\}[-\.][0-9]\{3\}[-\.][0-9]\{4\}" cli/packages/ --include="*.ts" --include="*.tsx"
```

### Scan 5: LocalStorage Usage
```bash
# PHI should never be in localStorage (use sessionStorage)
grep -rn "localStorage\.\(set\|get\)Item" cli/packages/apps/ --include="*.ts" --include="*.tsx"
```

### Scan 6: URL Parameters with PHI
```bash
# Check for PHI in URL construction
grep -rn "searchParams\|URLSearchParams\|encodeURIComponent" cli/packages/apps/ --include="*.ts" --include="*.tsx"
```

### Scan 7: Unmasked State Access
```bash
# Check for direct access to PHI fields without masking
grep -rn "\.ssn\|\.email\|\.phone\|\.mrn" cli/packages/apps/ --include="*.ts" --include="*.tsx"
```

### Scan 8: API Response Logging
```bash
# Check for response logging that might include PHI
grep -rn "response\.\(data\|body\)" cli/packages/apps/ --include="*.ts" --include="*.tsx" | grep -i "log\|console\|print"
```

## Security Patterns to Verify

### Safe Patterns (GOOD)
```typescript
// Masked display
const maskedSSN = `xxx-xx-${ssn.slice(-4)}`;

// Audit logging (logs action, not data)
logPHI("patient", patientId, { action: "view" });

// Error without PHI
throw new Error("Patient not found");

// SessionStorage for tokens
sessionStorage.setItem("token", token);
```

### Unsafe Patterns (BAD)
```typescript
// Logging PHI
console.log("Patient data:", patient);
console.log(`SSN: ${patient.ssn}`);

// PHI in URL
navigate(`/patient?ssn=${ssn}`);

// PHI in error message
throw new Error(`Patient ${email} not found`);

// LocalStorage for sensitive data
localStorage.setItem("patientData", JSON.stringify(patient));
```

## Report Format

```
PHI SECURITY SCAN REPORT
========================
Date: [current date]
Scope: cli/packages/

CRITICAL FINDINGS: [count]
--------------------------
[List files and line numbers with critical PHI exposure]

HIGH RISK: [count]
------------------
[List potential PHI leaks that need review]

MEDIUM RISK: [count]
--------------------
[List items that could be improved]

LOW RISK: [count]
-----------------
[List minor concerns]

SAFE PATTERNS FOUND: [count]
----------------------------
[List properly masked/handled PHI]

RECOMMENDATIONS:
----------------
1. [Specific fix for each critical finding]
2. [Improvements for high-risk items]
```

## PHI Field Reference

| Field | Pattern | Masking Required |
|-------|---------|------------------|
| SSN | XXX-XX-XXXX | xxx-xx-#### |
| Email | *@*.* | j***@example.com |
| Phone | XXX-XXX-XXXX | xxx-xxx-#### |
| MRN | Alphanumeric | Partial (4 chars) |
| DOB | Date | Varies by context |
| Address | Multi-field | Full or partial |

## Execution Steps

1. Run all scan commands above
2. Categorize findings by severity
3. Check each finding for false positives (test data, comments)
4. Generate report with line numbers and file paths
5. Provide specific remediation for each critical/high finding

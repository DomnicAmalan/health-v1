# HIPAA Compliance Check Skill

Run comprehensive HIPAA compliance checks on code changes and project configuration.

## What This Skill Does

1. Scans for PHI exposure in logs, errors, and console output
2. Verifies encryption configuration
3. Checks access control implementation
4. Reviews audit trail completeness
5. Validates data retention policies

## Execution Steps

### Step 1: Scan for Console Logging of PHI
Search the codebase for potential PHI leaks:
```bash
# Search for console.log with patient/PHI-related terms
grep -r "console\.log.*\(patient\|ssn\|email\|phone\|mrn\|dob\)" cli/packages/apps/ --include="*.ts" --include="*.tsx"
```

### Step 2: Check Error Message Sanitization
Verify `cli/packages/apps/client-app/src/lib/api/interceptors.ts`:
- `sanitizeErrorMessage` function removes PHI patterns
- Email regex: `/[\w.-]+@[\w.-]+\.\w+/g`
- SSN regex: `/\d{3}-\d{2}-\d{4}/g`
- Phone regex: `/\d{3}[-.]?\d{3}[-.]?\d{4}/g`

### Step 3: Verify Token Storage Security
Check token storage uses sessionStorage (not localStorage):
```bash
grep -r "localStorage" cli/packages/apps/ --include="*.ts" --include="*.tsx"
```
- HIPAA requires tokens cleared on session end
- sessionStorage is preferred over localStorage

### Step 4: Review Access Control
Check `cli/packages/libs/shared/src/constants/permissions.ts`:
- PATIENTS permissions include: view, create, update, delete, view_ssn, view_full
- CLINICAL permissions properly defined
- Role definitions (Admin, Doctor, Nurse, Receptionist) have appropriate restrictions

### Step 5: Validate Encryption at Rest
Check `cli/packages/apps/admin/src/lib/api/encryption.ts`:
- DEK (Data Encryption Key) management endpoints exist
- Master key rotation capability
- Encryption statistics tracking

### Step 6: Check Minimum Necessary Access
Review patient hooks in `cli/packages/apps/client-app/src/hooks/api/usePatients.ts`:
- Access is logged with useAuditLog
- PHI access triggers audit entries
- Only necessary fields are fetched

### Step 7: Generate Compliance Report

## HIPAA Security Rule Checklist

| Requirement | Status | Location |
|-------------|--------|----------|
| Access Control (164.312(a)) | Check permissions.ts | |
| Audit Controls (164.312(b)) | Check auditStore.ts | |
| Integrity Controls (164.312(c)) | Check interceptors | |
| Transmission Security (164.312(e)) | Check HTTPS config | |
| Encryption (164.312(a)(2)(iv)) | Check encryption.ts | |

## Red Flags to Report

- [ ] PHI logged to console
- [ ] Tokens in localStorage
- [ ] Unmasked PHI in error messages
- [ ] Missing audit log entries
- [ ] Hardcoded credentials
- [ ] PHI in URL parameters
- [ ] Missing HTTPS enforcement

## Output Format

```
HIPAA COMPLIANCE CHECK
======================
Date: [current date]

CRITICAL ISSUES: [count]
[List any critical violations]

WARNINGS: [count]
[List any warnings]

PASSED CHECKS: [count]
- Access control implementation
- Audit logging
- Token security
- Error sanitization
- Encryption configuration

RECOMMENDATIONS:
[List any improvements]
```

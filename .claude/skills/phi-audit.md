# PHI Audit Skill

Review and analyze PHI (Protected Health Information) access logs and audit trail for HIPAA compliance.

## What This Skill Does

1. Reviews audit log entries in the codebase
2. Identifies PHI access patterns
3. Checks audit middleware configuration
4. Verifies 7-year retention compliance (HIPAA requirement)
5. Reports on masked vs unmasked data handling

## Execution Steps

### Step 1: Review Audit Store Configuration
Read `cli/packages/apps/client-app/src/stores/auditStore.ts` and verify:
- MAX_ENTRIES is set appropriately (default: 10,000)
- HIPAA retention period is enforced (2555 days / 7 years)
- Masking functions cover all PHI fields: ssn, email, phone, mrn, creditCard, patientId, dateOfBirth

### Step 2: Check Audit Middleware
Read `cli/packages/apps/client-app/src/stores/middleware/auditMiddleware.ts` and verify:
- PHI_FIELDS array includes all sensitive fields
- detectPHIAccess function properly identifies PHI in state changes
- auditMiddleware logs all PHI access with: userId, action, resource, resourceId, timestamp

### Step 3: Verify API Interceptors
Read `cli/packages/apps/client-app/src/lib/api/interceptors.ts` and check:
- Response interceptor masks sensitive fields before caching
- Error sanitizer removes PHI patterns (email, SSN, phone regex)
- PHI access is logged to audit trail

### Step 4: Check Security Constants
Read `cli/packages/libs/shared/src/constants/security.ts` and verify:
- AUDIT.LOG_PHI_ACCESS is true
- AUDIT.RETENTION_DAYS is 2555 (7 years)
- AUDIT.MASK_IN_LOGS is true
- MASKING patterns are properly configured for SSN, EMAIL, PHONE, MRN

### Step 5: Generate Report
Output a compliance report with:
- PHI fields being tracked
- Masking patterns in use
- Retention period configuration
- Any gaps or recommendations

## PHI Fields Reference

These fields must always be tracked and masked:
- `ssn` - Social Security Number (format: xxx-xx-####)
- `email` - Email addresses (partial masking)
- `phone` - Phone numbers (format: xxx-xxx-####)
- `mrn` - Medical Record Number (partial masking)
- `patientId` - Patient identifiers
- `dateOfBirth` - Date of birth
- `address` - Physical addresses
- `creditCard` - Payment information (full masking)

## Expected Output

```
PHI AUDIT REPORT
================
Date: [current date]
Scope: Health V1 Application

PHI TRACKING STATUS:
- SSN tracking: [ENABLED/DISABLED]
- Email masking: [ENABLED/DISABLED]
- Phone masking: [ENABLED/DISABLED]
- MRN tracking: [ENABLED/DISABLED]

RETENTION COMPLIANCE:
- Configured retention: [X] days
- HIPAA requirement: 2555 days (7 years)
- Status: [COMPLIANT/NON-COMPLIANT]

AUDIT COVERAGE:
- Middleware: [ACTIVE/INACTIVE]
- API interceptors: [ACTIVE/INACTIVE]
- Store logging: [ACTIVE/INACTIVE]

RECOMMENDATIONS:
- [List any gaps or improvements]
```

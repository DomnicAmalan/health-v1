---
sidebar_position: 1
title: HIPAA Compliance
description: PHI handling, audit trail, and HIPAA compliance requirements
---

# HIPAA Compliance

Health V1 is designed to meet the requirements of the Health Insurance Portability and Accountability Act (HIPAA). This document describes the technical safeguards, audit trail requirements, and development practices that ensure compliance.

## Audit Trail

### Retention Policy

All audit records are retained for **7 years (2555 days)** as required by HIPAA. This applies to:

- PHI access logs
- Authentication events (login, logout, failed attempts)
- Data modification records (create, update, delete)
- Export and download events
- Administrative actions (user management, role changes)

Audit records are immutable. Once written, they cannot be modified or deleted (even by administrators) until the retention period expires.

### Frontend: useAuditLog Hook

All frontend code that accesses or displays PHI must use the `useAuditLog` hook to record the access:

```typescript
import { useAuditLog } from '@/hooks/useAuditLog';

function PatientDemographics({ patientId }: { patientId: string }) {
  const { logPHI } = useAuditLog();

  useEffect(() => {
    // Log that this user viewed patient demographics
    logPHI('patient_demographics_view', {
      patientId,
      fields: ['name', 'dob', 'address', 'phone'],
    });
  }, [patientId]);

  // ... render patient data
}
```

The `logPHI()` function records:

- The authenticated user's ID and role
- The action performed
- The resource type and ID
- Which PHI fields were accessed
- Timestamp
- Client IP and user agent

### Backend Audit Tables

Backend services write audit events directly to PostgreSQL audit tables within the same transaction as the data operation. This ensures that no data change occurs without a corresponding audit record:

```rust
pub async fn patient_update(
    db: &PgPool,
    user_id: Uuid,
    patient_id: Uuid,
    payload: UpdatePatientRequest,
) -> Result<Patient, AppError> {
    let mut tx = db.begin().await?;

    // Perform the update
    let patient = sqlx::query_as!(
        Patient,
        "UPDATE patients SET first_name = $1, last_name = $2 WHERE id = $3 RETURNING *",
        payload.first_name,
        payload.last_name,
        patient_id
    )
    .fetch_one(&mut *tx)
    .await?;

    // Audit trail (same transaction -- both succeed or both fail)
    sqlx::query!(
        "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)",
        user_id,
        "patient_update",
        "patient",
        patient_id,
        serde_json::to_value(&payload)?,
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(patient)
}
```

## PHI Fields

The following fields are classified as Protected Health Information under HIPAA and must always be tracked and masked:

| Field | Description | Masking Example |
|-------|-------------|-----------------|
| **SSN** | Social Security Number | `***-**-1234` |
| **Email** | Patient email address | `j***@example.com` |
| **Phone** | Patient phone number | `(***) ***-5678` |
| **MRN** | Medical Record Number | `MRN-****1234` |
| **Date of Birth** | Patient date of birth | `**/**/1990` |
| **Physical Address** | Home/mailing address | `*** Main St, ***` |
| **Insurance Info** | Policy numbers, group IDs | `Policy: ****5678` |
| **Credit Card** | Payment card information | `****-****-****-1234` |

For complete field definitions and masking rules, see the [PHI Fields Reference](./phi-fields.md).

## Error Message Sanitization

Error messages returned to clients and written to logs are sanitized to remove PHI patterns. The sanitization layer:

- Strips SSN patterns (`\d{3}-\d{2}-\d{4}`)
- Strips phone number patterns
- Strips email addresses from error context
- Replaces patient names in error messages with generic identifiers
- Removes MRN values from stack traces and log output

```rust
// Error messages are sanitized before logging or returning to the client.
// Internal: "Patient John Doe (SSN: 123-45-6789) not found"
// Sanitized: "Patient [REDACTED] (SSN: [REDACTED]) not found"
```

Never include PHI in error messages. Use identifiers (UUIDs) instead of patient names or other identifying information:

```rust
// GOOD: Use non-PHI identifiers
Err(AppError::NotFound(format!("Patient with ID {} not found", patient_id)))

// BAD: Includes PHI in error message
Err(AppError::NotFound(format!("Patient {} {} not found", first_name, last_name)))
```

## Token Storage

Health V1 uses **`sessionStorage`** for authentication tokens, not `localStorage`. This is a deliberate security choice:

- `sessionStorage` is cleared when the browser tab is closed
- `sessionStorage` is not shared across tabs (prevents session leakage)
- `localStorage` persists indefinitely and is accessible from any tab on the same origin

```typescript
// GOOD: Session-scoped storage
sessionStorage.setItem('auth_token', token);

// BAD: Persistent storage (security risk)
localStorage.setItem('auth_token', token); // NEVER do this
```

## Data at Rest Encryption

### Master Key

The `MASTER_KEY` environment variable (32 bytes hex-encoded) serves as the root encryption key. This value **must** be changed from the default in production environments and stored securely (not in source control).

### Data Encryption Keys (DEK)

Data encryption keys are managed through the RustyVault service:

- DEKs encrypt PHI fields at rest in the database
- DEKs are rotated periodically (configurable interval)
- The Master Key encrypts the DEKs (envelope encryption pattern)
- Key rotation does not require re-encryption of all data (new data uses the new key; old data is re-encrypted on access)

For key management operations, use the `/encryption-ops` skill.

## Access Controls

### Role-Based Access Control (RBAC)

The `authz-core` crate implements RBAC with the following hierarchy:

- **System Admin**: Full access to all resources and configuration
- **Clinic Admin**: Manage users, roles, and clinic settings
- **Provider**: Access to patient records, orders, and clinical data
- **Nurse**: Access to vitals, medications, and care plans
- **Front Desk**: Access to scheduling, demographics, and billing
- **Billing**: Access to charges, payments, and insurance claims

### Attribute-Based Access Control (ABAC)

In addition to roles, access policies can include attribute-based conditions:

- Department membership
- Provider-patient assignment
- Time-based access windows
- Emergency override ("break the glass") with mandatory justification logging

## Compliance Skills

Health V1 includes Claude Code skills for compliance tasks. These can be invoked during development:

| Skill | Description |
|-------|-------------|
| `/phi-audit` | Review PHI access logs and audit trail for HIPAA compliance |
| `/hipaa-check` | Run HIPAA compliance checks on code changes |
| `/phi-scan` | Scan code for potential PHI exposure or security issues |
| `/audit-report` | Generate audit reports for compliance reviews |
| `/de-identify` | De-identify PHI using HIPAA Safe Harbor method |
| `/encryption-ops` | Manage DEK rotation and encryption key operations |

### Example Usage

To check a code change for HIPAA compliance before committing:

```
/hipaa-check
```

To scan for potential PHI exposure in a module:

```
/phi-scan
```

To generate an audit report for a compliance review:

```
/audit-report
```

## Compliance Checklist

For every feature that touches patient data:

- [ ] All PHI access is logged via `useAuditLog` (frontend) or audit tables (backend)
- [ ] Error messages do not contain PHI
- [ ] Tokens stored in `sessionStorage` only
- [ ] PHI fields are masked in non-clinical displays
- [ ] Access is restricted by role (RBAC policies configured)
- [ ] Data modifications are recorded in audit trail
- [ ] PHI is encrypted at rest
- [ ] Export/download operations are logged
- [ ] No PHI in application logs
- [ ] De-identification used for non-production environments

# Audit Report Generator Skill

Generate comprehensive audit reports for compliance reviews, security audits, and regulatory requirements.

## What This Skill Does

1. Analyzes audit log entries
2. Generates compliance reports
3. Identifies access patterns and anomalies
4. Creates reports for HIPAA audits
5. Tracks PHI access by user/resource

## Report Types

### 1. PHI Access Report
Summary of all PHI access for a specific time period.

### 2. User Activity Report
Detailed activity log for a specific user.

### 3. Resource Access Report
Who accessed a specific patient record or resource.

### 4. Security Incident Report
Unusual access patterns or potential breaches.

### 5. Compliance Summary
Overall compliance status for auditors.

## Reference Files

- `cli/packages/apps/client-app/src/stores/auditStore.ts` - Audit store implementation
- `cli/packages/libs/shared/src/types/audit.ts` - Audit entry types
- `cli/packages/libs/shared/src/constants/security.ts` - Security configuration

## Audit Entry Structure

```typescript
interface AuditEntry {
  id: string;
  userId: string;
  action: string;          // e.g., "read", "create", "update", "delete"
  resource: string;        // e.g., "patient", "clinical_note", "lab_result"
  resourceId?: string;     // ID of accessed resource
  timestamp: string;       // ISO 8601 format
  details?: Record<string, unknown>;
  masked: boolean;         // Whether PHI was masked in this entry
}
```

## Report Templates

### PHI Access Report
```markdown
# PHI ACCESS REPORT
Generated: [timestamp]
Period: [start_date] to [end_date]

## Summary
- Total PHI accesses: [count]
- Unique users: [count]
- Unique patients: [count]
- Peak access time: [time_range]

## Access by Resource Type
| Resource Type | View | Create | Update | Delete |
|--------------|------|--------|--------|--------|
| Patient      | X    | X      | X      | X      |
| Clinical Note| X    | X      | X      | X      |
| Lab Result   | X    | X      | X      | X      |
| Medication   | X    | X      | X      | X      |

## Access by User Role
| Role         | Count | Percentage |
|--------------|-------|------------|
| Doctor       | X     | X%         |
| Nurse        | X     | X%         |
| Admin        | X     | X%         |

## Top Users by Access Count
1. [user_id] - [count] accesses
2. [user_id] - [count] accesses
3. [user_id] - [count] accesses

## Anomalies Detected
- [List any unusual patterns]
```

### User Activity Report
```markdown
# USER ACTIVITY REPORT
Generated: [timestamp]
User ID: [user_id]
Period: [start_date] to [end_date]

## User Information
- Name: [name]
- Role: [role]
- Department: [department]
- Status: [active/inactive]

## Activity Summary
- Total actions: [count]
- PHI accesses: [count]
- Last active: [timestamp]

## Activity Timeline
| Timestamp | Action | Resource | Resource ID | Details |
|-----------|--------|----------|-------------|---------|
| [time]    | [act]  | [res]    | [id]        | [det]   |

## Access Patterns
- Most accessed resource type: [type]
- Peak activity hours: [hours]
- Average daily accesses: [count]

## Security Notes
- [Any concerning patterns]
- [After-hours access]
- [Bulk access events]
```

### Resource Access Report
```markdown
# RESOURCE ACCESS REPORT
Generated: [timestamp]
Resource: [resource_type]
Resource ID: [resource_id]
Period: [start_date] to [end_date]

## Resource Information
- Type: [patient/clinical_note/etc]
- Created: [timestamp]
- Last Modified: [timestamp]

## Access Summary
- Total accesses: [count]
- Unique users: [count]
- Most recent access: [timestamp]

## Access Log
| Timestamp | User ID | User Role | Action | Details |
|-----------|---------|-----------|--------|---------|
| [time]    | [id]    | [role]    | [act]  | [det]   |

## Access by Action Type
- View: [count]
- Update: [count]
- Export: [count]

## Authorized vs Unauthorized
- Authorized accesses: [count]
- Denied accesses: [count]
```

### Compliance Summary Report
```markdown
# HIPAA COMPLIANCE SUMMARY
Generated: [timestamp]
Reporting Period: [period]

## Executive Summary
Overall Compliance Score: [X]%

## Audit Control (164.312(b))
- Audit logging enabled: [YES/NO]
- Retention period: [X] days (Required: 2555)
- Log integrity verified: [YES/NO]

## Access Control (164.312(a))
- Role-based access: [IMPLEMENTED]
- Minimum necessary: [IMPLEMENTED]
- Emergency access procedure: [DOCUMENTED]

## Encryption (164.312(a)(2)(iv))
- Encryption at rest: [YES/NO]
- Key management: [IMPLEMENTED]
- Last master key rotation: [date]

## PHI Access Statistics
- Total PHI accesses: [count]
- Authorized: [count] ([X]%)
- Denied: [count] ([X]%)

## Incidents
- Security incidents: [count]
- Breach notifications: [count]
- Remediation actions: [count]

## Recommendations
1. [recommendation]
2. [recommendation]

## Certification
This report was generated automatically from audit logs.
Data integrity verified: [YES/NO]
```

## Query Functions

```typescript
// Get entries by date range
const entries = auditStore.getState().entries.filter(
  e => e.timestamp >= startDate && e.timestamp <= endDate
);

// Get entries by user
const userEntries = auditStore.getState().getEntriesByUser(userId);

// Get entries by resource
const resourceEntries = auditStore.getState().getEntriesByResource(resourceType, resourceId);

// Export entries (masked or unmasked)
const exportData = auditStore.getState().exportEntries(startDate, endDate, masked);
```

## Execution Steps

1. Ask user what report type they need
2. Determine date range and filters
3. Query audit store or API for entries
4. Analyze patterns and generate statistics
5. Format report using appropriate template
6. Highlight any anomalies or concerns
7. Provide actionable recommendations

## Compliance Retention

- HIPAA requires 6-7 year retention
- Project configured for 2555 days (7 years)
- Reports should be archived separately
- Never delete audit logs before retention period

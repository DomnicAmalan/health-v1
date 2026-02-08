---
sidebar_position: 4
title: Audit Logging
description: Audit trail implementation for HIPAA compliance
---

# Audit Logging

<!-- TODO: Document audit logging architecture, useAuditLog hook, and backend audit tables -->

## Overview

All access to Protected Health Information (PHI) is logged for HIPAA compliance with a 7-year retention policy (2555 days).

## Frontend: useAuditLog Hook

Use the `useAuditLog` hook in React components to log PHI access:

```typescript
import { useAuditLog } from '@/hooks/useAuditLog';

function PatientView({ patientId }: { patientId: string }) {
  const { logPHI } = useAuditLog();

  useEffect(() => {
    logPHI('patient_view', { patientId });
  }, [patientId]);
}
```

## Backend Audit Tables

Audit events are stored in PostgreSQL with the following information:
- User ID and role
- Action performed
- Resource type and ID
- Timestamp
- IP address and user agent

## Audit Reports

Use the `/audit-report` skill to generate compliance reports.

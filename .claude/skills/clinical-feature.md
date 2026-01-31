# Clinical Feature Generator Skill

Generate clinical features (orders, results, notes, medications) with proper PHI handling and HIPAA compliance.

## What This Skill Does

1. Creates clinical data types following healthcare standards
2. Generates API hooks with audit logging
3. Implements proper PHI masking
4. Follows HL7/FHIR patterns where applicable
5. Ensures role-based access control

## Clinical Feature Types

### Clinical Notes
- Progress Notes
- History & Physical (H&P)
- Discharge Summaries
- Operative Reports
- Consultation Notes

### Orders
- Laboratory Orders
- Radiology Orders
- Medication Orders (Prescriptions)
- Procedure Orders
- Referral Orders

### Results
- Lab Results
- Radiology Reports
- Pathology Reports
- Vital Signs

### Pharmacy
- Medications
- Prescriptions
- Drug Interactions
- Allergies

## Reference Files

Read these before generating:
- `cli/packages/apps/client-app/src/routes/clinical.tsx`
- `cli/packages/apps/client-app/src/routes/orders.tsx`
- `cli/packages/apps/client-app/src/routes/results.tsx`
- `cli/packages/apps/client-app/src/routes/pharmacy.tsx`
- `cli/packages/libs/shared/src/constants/permissions.ts`

## Type Templates

### Clinical Note Type
```typescript
interface ClinicalNote {
  id: string;
  patientId: string;           // PHI reference
  encounterId?: string;
  noteType: ClinicalNoteType;

  // Content
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  assessment: string;
  plan: string;

  // Metadata
  authorId: string;
  authorName: string;
  authorRole: string;
  signedAt?: string;
  signedBy?: string;

  // Audit
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'final' | 'amended' | 'entered_in_error';
}

type ClinicalNoteType =
  | 'progress_note'
  | 'history_physical'
  | 'discharge_summary'
  | 'operative_report'
  | 'consultation';
```

### Order Type
```typescript
interface Order {
  id: string;
  patientId: string;           // PHI reference
  encounterId?: string;
  orderType: OrderType;

  // Order details
  orderCode: string;           // CPT, LOINC, or internal code
  orderName: string;
  priority: 'stat' | 'urgent' | 'routine';
  instructions?: string;

  // Diagnosis (ICD-10)
  diagnosisCodes: string[];

  // Ordering provider
  orderingProviderId: string;
  orderingProviderName: string;

  // Status tracking
  status: OrderStatus;
  orderedAt: string;
  scheduledAt?: string;
  completedAt?: string;

  // Results reference
  resultId?: string;
}

type OrderType = 'lab' | 'radiology' | 'medication' | 'procedure' | 'referral';
type OrderStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
```

### Lab Result Type
```typescript
interface LabResult {
  id: string;
  orderId: string;
  patientId: string;           // PHI reference

  // Test information
  testCode: string;            // LOINC code
  testName: string;

  // Result data
  value: string | number;
  unit: string;
  referenceRange: string;
  interpretation: 'normal' | 'abnormal' | 'critical';

  // Flags
  isCritical: boolean;
  isAbnormal: boolean;

  // Verification
  performedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;

  // Review tracking
  reviewedAt?: string;
  reviewedBy?: string;
  status: 'pending_review' | 'reviewed' | 'acknowledged';
}
```

### Medication Type
```typescript
interface Medication {
  id: string;
  patientId: string;           // PHI reference

  // Drug information
  drugCode: string;            // NDC or RxNorm
  drugName: string;
  genericName: string;
  strength: string;
  form: string;                // tablet, capsule, injection, etc.

  // Prescription details
  dosage: string;
  frequency: string;
  route: string;               // oral, IV, topical, etc.
  duration?: string;
  quantity: number;
  refills: number;

  // Prescriber
  prescriberId: string;
  prescriberName: string;

  // Dates
  prescribedAt: string;
  startDate: string;
  endDate?: string;

  // Status
  status: 'active' | 'discontinued' | 'completed' | 'on_hold';
  discontinuedReason?: string;
}
```

## Hook Pattern for Clinical Features

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "../security/useAuditLog";
import { usePermissions } from "../security/usePermissions";

export function useClinicalNotes(patientId: string) {
  const { logPHI } = useAuditLog();
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: ["clinical-notes", "list", patientId],
    queryFn: async () => {
      // Permission check
      if (!hasPermission("CLINICAL", "view")) {
        throw new Error("Insufficient permissions");
      }

      const response = await apiClient.get<ClinicalNote[]>(
        API_ROUTES.CLINICAL.NOTES.LIST(patientId)
      );

      if (response.error) throw new Error(response.error.message);

      // Log PHI access
      logPHI("clinical_notes", patientId, {
        action: "list",
        count: response.data?.length
      });

      return response.data;
    },
    enabled: !!patientId && hasPermission("CLINICAL", "view"),
    staleTime: 60 * 1000, // Clinical data cached longer
  });
}
```

## Permissions Required

```typescript
// From permissions.ts
CLINICAL: {
  view: "clinical:view",
  create: "clinical:create",
  update: "clinical:update",
  delete: "clinical:delete",
},

ORDERS: {
  view: "orders:view",
  create: "orders:create",
  update: "orders:update",
  delete: "orders:delete",
},

RESULTS: {
  view: "results:view",
  create: "results:create",
  update: "results:update",
  delete: "results:delete",
},

PHARMACY: {
  view: "pharmacy:view",
  create: "pharmacy:create",
  update: "pharmacy:update",
  delete: "pharmacy:delete",
},
```

## PHI Considerations for Clinical Data

- All clinical data references patientId (PHI)
- Lab results may contain sensitive values
- Medication lists can indicate conditions
- Clinical notes contain narrative PHI
- Always log access via audit system
- Apply role-based viewing restrictions

## Execution Steps

1. Ask user what clinical feature they need
2. Determine appropriate type structure
3. Generate TypeScript types with PHI markers
4. Generate API routes
5. Generate TanStack Query hooks with:
   - Permission checks
   - Audit logging
   - Proper error handling
6. Add route to appropriate app
7. Verify PHI handling

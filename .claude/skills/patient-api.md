# Patient API Generator Skill

Generate patient-related API endpoints, React Query hooks, and TypeScript types following project patterns.

## What This Skill Does

1. Creates new patient-related API endpoints
2. Generates TanStack Query hooks with audit logging
3. Creates TypeScript types following patient.ts patterns
4. Ensures PHI fields are properly marked

## Reference Files

Before generating, read these files for patterns:
- `cli/packages/libs/shared/src/types/patient.ts` - Patient type definitions
- `cli/packages/libs/shared/src/api/routes.ts` - API route patterns
- `cli/packages/apps/client-app/src/hooks/api/usePatients.ts` - Hook patterns
- `cli/packages/libs/shared/src/constants/security.ts` - PHI masking config

## Patient Type Structure

```typescript
interface Patient {
  // Immutable fields (cannot be changed after creation)
  id: string;
  patientId: string;
  ssn: string;           // PHI - Must be masked
  dateOfBirth: string;   // PHI
  createdAt: string;
  createdBy: string;
  auditTrail: AuditEntry[];

  // Mutable fields
  firstName: string;
  lastName: string;
  email: string;         // PHI - Must be masked
  phone: string;         // PHI - Must be masked
  mrn: string;           // PHI - Medical Record Number
  address?: Address;     // PHI
  status: PatientStatus;
  updatedAt: string;
  updatedBy: string;
}
```

## Hook Pattern Template

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "../security/useAuditLog";
import type { ApiResponse } from "@lazarus-life/shared/api/types";
import { API_ROUTES } from "@lazarus-life/shared/api/routes";

const QUERY_KEYS = {
  all: ["resourceName"] as const,
  lists: () => [...QUERY_KEYS.all, "list"] as const,
  list: (filters?: unknown) => [...QUERY_KEYS.lists(), { filters }] as const,
  details: () => [...QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
};

export function useResource(id: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Resource>(API_ROUTES.RESOURCE.GET(id));
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      // IMPORTANT: Log PHI access
      logPHI("resource", id, { action: "read" });

      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  const { logPHI } = useAuditLog();

  return useMutation({
    mutationFn: async (data: CreateResourceDto) => {
      const response = await apiClient.post<Resource>(API_ROUTES.RESOURCE.CREATE, data);
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      if (data?.id) {
        logPHI("resource", data.id, { action: "create" });
      }
    },
  });
}
```

## API Route Pattern

Add to `cli/packages/libs/shared/src/api/routes.ts`:

```typescript
RESOURCE_NAME: {
  LIST: "/v1/resource-name",
  GET: (id: string) => `/v1/resource-name/${id}`,
  CREATE: "/v1/resource-name",
  UPDATE: (id: string) => `/v1/resource-name/${id}`,
  DELETE: (id: string) => `/v1/resource-name/${id}`,
},
```

**IMPORTANT**: Never include `/api` prefix - it's added automatically.

## PHI Fields Checklist

When creating patient-related types, mark these as PHI:
- [ ] SSN (Social Security Number)
- [ ] Email address
- [ ] Phone number
- [ ] MRN (Medical Record Number)
- [ ] Date of birth
- [ ] Physical address
- [ ] Insurance information
- [ ] Medical conditions/diagnoses
- [ ] Medications
- [ ] Lab results
- [ ] Clinical notes

## Execution Steps

1. Ask user what patient-related feature they need
2. Read reference files for current patterns
3. Generate TypeScript types with PHI markers
4. Generate API routes following naming convention
5. Generate TanStack Query hooks with audit logging
6. Verify PHI fields are properly handled

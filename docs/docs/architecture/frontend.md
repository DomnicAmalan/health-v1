---
sidebar_position: 3
title: Frontend Architecture
description: TypeScript/React frontend architecture and patterns
---

# Frontend Architecture

The Health V1 frontend is a Bun workspace monorepo containing three React applications and two shared libraries. All applications are built with TypeScript and can target both web browsers and native desktop via Tauri.

## Monorepo Structure

```
cli/
  packages/
    apps/
      client-app/       # Clinical application (port 5175)
        src/
          components/   # Feature components (ehr/, workflow/, billing/)
          hooks/        # Custom hooks (api/, ehr/, workflows/)
          lib/          # Utilities and API config
          routes/       # File-based route definitions
        e2e/            # Playwright E2E tests
      admin/            # Admin dashboard (port 5174)
        src/
          lib/api/      # Admin API functions
          routes/       # Admin route definitions
      rustyvault-ui/    # Vault management (port 8215)
        src/
          routes/       # Vault route definitions
    libs/
      shared/           # @lazarus-life/shared
        src/
          api/          # createApiClient, routes.ts
          types/        # Shared TypeScript types
      components/       # @lazarus-life/ui-components
        src/
          workflow/     # Workflow-specific components
          index.ts      # Component exports
```

## Applications

### client-app (Port 5175)

The primary application for clinical users: doctors, nurses, and front desk staff. It provides:

- Patient management with duplicate checking and merge capabilities
- Encounter documentation and clinical notes
- Order entry for labs and imaging
- Results review
- Vital signs recording
- Problem list management
- Pharmacy and prescription management
- Workflow visualization and task management
- OPD queue and scheduling

Authentication uses JWT tokens via the `TokenAuthClient` strategy.

### admin (Port 5174)

The organization administration dashboard for system administrators. It provides:

- User account management
- Role and permission assignment
- Organization settings
- Workflow configuration
- Department management

Authentication uses session cookies via the `SessionAuthClient` strategy.

### rustyvault-ui (Port 8215)

A dedicated interface for the security team to manage the vault service. It provides:

- Secret storage and retrieval
- Encryption key lifecycle management
- AppRole and UserPass authentication configuration
- Policy management
- Audit log review

Authentication uses vault tokens via the `VaultAuthClient` strategy. Note that the API base URL for this app points to port 4117 (the vault service) and must include the `/v1` prefix.

## Routing: TanStack Router

All three applications use TanStack Router with file-based routing. Route files are placed in `src/routes/` and the router automatically generates the route tree.

```
src/routes/
  __root.tsx          # Root layout with navigation
  index.tsx           # Home / dashboard
  clinical.tsx        # Clinical overview
  orders.tsx          # Order entry
  results.tsx         # Results review
  scheduling.tsx      # Appointment scheduling
  workflows.tsx       # Workflow management
  compliance-status.tsx  # Compliance dashboard
```

Each route file exports a component and route configuration:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/clinical")({
  component: ClinicalPage,
});

function ClinicalPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Clinical Overview</h1>
      {/* Page content */}
    </div>
  );
}
```

## Server State: TanStack Query

All server data fetching uses TanStack Query (React Query) for caching, background refetching, and optimistic updates. Custom hooks encapsulate query logic for each domain.

```tsx
// hooks/api/ehr/useEhrPatients.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/auth";
import type { Patient, CreatePatientRequest } from "@lazarus-life/shared";

const PATIENT_KEYS = {
  all: ["patients"] as const,
  list: (params: ListParams) => [...PATIENT_KEYS.all, "list", params] as const,
  detail: (id: string) => [...PATIENT_KEYS.all, "detail", id] as const,
};

export function usePatients(params: ListParams) {
  return useQuery({
    queryKey: PATIENT_KEYS.list(params),
    queryFn: () => apiClient.get<Patient[]>(`/v1/ehr/patients`, { params }),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePatientRequest) =>
      apiClient.post<Patient>(`/v1/ehr/patients`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PATIENT_KEYS.all });
    },
  });
}
```

## Client State: Zustand

Local application state that does not originate from the server is managed with Zustand. Stores are small, focused, and colocated with the features they serve.

```tsx
import { create } from "zustand";

interface SidebarStore {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: true,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  close: () => set({ isOpen: false }),
}));
```

## Styling: Tailwind CSS

All applications use Tailwind CSS for utility-first styling. The shared component library (`@lazarus-life/ui-components`) is built on shadcn/ui, providing a consistent design language across all three apps.

```tsx
function PatientCard({ patient }: { patient: Patient }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="text-lg font-semibold">
        {patient.lastName}, {patient.firstName}
      </h3>
      <p className="text-sm text-muted-foreground">MRN: {patient.mrn}</p>
    </div>
  );
}
```

## Desktop Builds: Tauri

All frontend applications can be compiled as native desktop applications using Tauri. This provides:

- Native window management
- Local file system access (where needed)
- System tray integration
- Auto-update capability

Tauri configurations are colocated with each application in their respective `src-tauri/` directories.

## Shared Libraries

### @lazarus-life/shared

Contains all shared TypeScript types, the API client factory (`createApiClient`), and centralized route definitions.

Key exports:

- **Types**: Patient, Encounter, Workflow, VitalSigns, LabTest, Prescription, Invoice, and all associated request/response types
- **API Client**: `createApiClient()` factory supporting three auth strategies
- **Routes**: Centralized route constants for all API endpoints
- **Utilities**: Date formatting, validation helpers, PHI masking

### @lazarus-life/ui-components

A reusable component library built on shadcn/ui. Components are exported from a central `index.ts`:

```tsx
// packages/libs/components/src/index.ts
export { Button } from "./button";
export { Card, CardContent, CardHeader, CardTitle } from "./card";
export { DataTable } from "./data-table";
export { Dialog, DialogContent, DialogHeader } from "./dialog";
export { Form, FormField, FormItem, FormLabel } from "./form";
// ... additional components
```

The library also includes domain-specific components such as the workflow designer components in `src/workflow/`.

## TypeScript Conventions

### No `any` Types

The `any` type is strictly prohibited. Use `unknown` for truly unknown types and narrow with type guards:

```tsx
// CORRECT
function processResponse(data: unknown): Patient {
  if (!isPatient(data)) {
    throw new Error("Invalid patient data");
  }
  return data;
}

// INCORRECT - never do this
function processResponse(data: any): Patient {
  return data as Patient;
}
```

### Type Imports

Always use `type` imports for type-only imports to ensure they are erased at compile time:

```tsx
import type { Patient, Encounter } from "@lazarus-life/shared";
import { usePatients } from "@/hooks/api/ehr/useEhrPatients";
```

### PHI Access Logging

Any component or hook that accesses Protected Health Information (PHI) must log the access using the `useAuditLog` hook and `logPHI()` function:

```tsx
import { useAuditLog, logPHI } from "@/hooks/useAuditLog";

function PatientDetails({ patientId }: { patientId: string }) {
  const { logAccess } = useAuditLog();
  const { data: patient } = usePatient(patientId);

  useEffect(() => {
    if (patient) {
      logAccess({
        action: "VIEW",
        resourceType: "PATIENT",
        resourceId: patientId,
      });
      logPHI("patient_details_viewed", { patientId });
    }
  }, [patient, patientId, logAccess]);

  return (
    <div>
      <h2>{patient?.firstName} {patient?.lastName}</h2>
      {/* Patient details */}
    </div>
  );
}
```

## Session Storage

Tokens are stored in `sessionStorage`, not `localStorage`. This is a security requirement: `sessionStorage` is scoped to the browser tab and cleared when the tab closes, reducing the window of exposure if a device is shared.

```tsx
// CORRECT
sessionStorage.setItem("access_token", token);

// INCORRECT - never store tokens in localStorage
localStorage.setItem("access_token", token);  // Security risk
```

## Development Commands

All frontend commands are available through the project Makefile:

```bash
make dev-client       # Start client-app dev server (port 5175)
make dev-admin        # Start admin dev server (port 5174)
make dev-vault        # Start rustyvault-ui dev server (port 8215)
make dev-all          # Start all apps in parallel
make test-unit        # Run frontend unit tests
make test-e2e         # Run Playwright E2E tests
make lint             # Run all linters
make lint-fix         # Auto-fix lint issues
make build-frontend   # Build all frontend apps
```

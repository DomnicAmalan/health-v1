---
sidebar_position: 1
title: UX Audit Findings
description: UX audit results, scores, and improvement recommendations
---

# UX Audit Findings

This document presents the results of a comprehensive UX audit conducted across all three Health V1 frontend applications: the client application (`client-app`), the admin dashboard (`admin`), and the RustyVault UI (`rustyvault-ui`). Each category was scored on a 1-10 scale based on industry standards for healthcare software, HIPAA compliance requirements, and general usability heuristics.

## Summary Scores

| Category | Score | Rating |
|---|---|---|
| Error Handling | 4/10 | Critical gap |
| User Feedback | 3/10 | Critical gap |
| Onboarding | 5/10 | Moderate gap |
| Navigation | 6/10 | Moderate gap |
| Data Entry | 6/10 | Moderate gap |
| Accessibility | 4/10 | Critical gap |
| Role-based UX | 5/10 | Moderate gap |
| Clinical Workflow | 6/10 | Moderate gap |

**Overall weighted score: 4.9/10**

The platform has a solid technical foundation -- TanStack Router for navigation, TanStack Query for data fetching, a shared component library built on shadcn/ui, and a well-structured EHR component set including patient banners, clinical note forms, vital signs panels, and order entry dialogs. However, the user experience layer on top of this foundation is underdeveloped in several areas that directly affect clinician productivity and patient safety.

---

## Critical Gaps

### Error Handling (4/10)

Error handling is the most impactful gap from a patient safety perspective. When a clinician encounters an error during an order entry or clinical note save, they need to immediately understand what went wrong and how to recover. The current implementation falls short.

**Current issues:**

- **Raw API messages shown to users.** When a backend request fails, the error message from the Rust API service (typically an `AppError` variant like `"Database error: unique constraint violation on encounters.encounter_id"`) is displayed directly. Clinicians should never see database terminology.

- **No error categorization.** All errors are treated the same regardless of severity. A network timeout and a validation failure produce the same generic rendering with no differentiation in urgency or recovery path.

- **No recovery suggestions.** When a lab order fails to submit, the user receives no guidance on whether to retry, check their input, or contact support. The `ErrorBoundary` component in the shared library catches React rendering errors and sanitizes PHI from error messages, but there is no equivalent pattern for API response errors.

- **No retry mechanisms.** TanStack Query is configured for data fetching but its retry capabilities are not systematically leveraged. Failed mutations (writes) do not offer a "Try Again" action in the UI.

- **No offline handling.** If the backend becomes unreachable (common in hospital environments with network segmentation), there is no detection or graceful degradation. The application silently fails.

**Specific examples:**

1. In the patient registration flow (`PatientFormDialog.tsx`), submitting a patient with a duplicate MRN returns a raw 409 error. The user sees the API response body rather than a message like "A patient with this MRN already exists. Would you like to view the existing record?"

2. In the encounter creation flow, a database timeout produces a generic error toast with no indication of whether the encounter was partially saved.

3. The `OrderLabDialog` component does not handle the case where the lab catalog API is unreachable, resulting in an empty dropdown with no explanation.

**Proposed fixes (prioritized):**

1. Create an error translation layer that maps API error codes to user-friendly messages with recovery actions.
2. Add a `useErrorHandler` hook that categorizes errors (validation, network, permission, server) and routes them to appropriate UI patterns (inline, toast, full-page).
3. Implement retry buttons on all mutation error states using TanStack Query's `mutate` retry.
4. Add network status detection with a degraded-service banner.

### User Feedback (3/10)

Clinicians work under time pressure and need immediate visual confirmation that their actions succeeded. The current application provides minimal feedback during and after operations.

**Current issues:**

- **No skeleton loaders in practice.** The shared component library exports a `Skeleton` component, and `PatientBanner` defines a local skeleton, but neither is used systematically across data-loading views. Most pages show either nothing or a brief flash of empty content before data appears.

- **No success confirmations.** After saving a clinical note, adding a medication, or ordering a lab test, there is no success toast, checkmark animation, or status change to confirm the action completed. The user must infer success from the data refreshing.

- **Minimal loading indicators.** Long-running operations like patient search or report generation show no progress indication. The user cannot distinguish between "still loading" and "failed silently."

- **No optimistic updates.** TanStack Query supports optimistic mutations, but this pattern is not used. When a clinician adds a vital sign, the value does not appear in the list until the server round-trip completes, which can take 1-3 seconds on slower networks.

**Specific examples:**

1. The patient list view (`patients.tsx` route) fetches data via `useEhrPatients` but shows no loading skeleton while the list loads. On first navigation, the user sees an empty screen for 500ms-2s.

2. After successfully ordering a lab via `OrderLabDialog`, the dialog closes with no feedback. The user must scroll through the order list to verify the order appeared.

3. The `AddVitalsDialog` submits vitals and closes the dialog on success, but there is no toast or animation confirming the save. If the network is slow, the user may click "Save" multiple times.

**Proposed fixes (prioritized):**

1. Create skeleton variants for each major data view: `PatientListSkeleton`, `VitalSignsSkeleton`, `OrderListSkeleton`, `ClinicalNoteSkeleton`.
2. Add success toasts for all mutation operations using a centralized toast system.
3. Implement optimistic updates for high-frequency operations (vitals entry, order status changes).
4. Add a global loading bar (thin progress indicator at the top of the viewport) for route transitions.

### Accessibility (4/10)

No formal WCAG audit has been performed. The issues listed below were identified through manual inspection and are likely a subset of the actual accessibility problems.

**Current issues:**

- **Inconsistent focus management.** Dialog components from shadcn/ui (Radix primitives) handle focus trapping correctly, but custom modal-like patterns in the EHR components do not consistently return focus to the triggering element on close.

- **No screen reader testing.** None of the EHR-specific components (`PatientBanner`, `VitalSignsPanel`, `ProblemList`, `MedicationList`, etc.) have been tested with VoiceOver, NVDA, or JAWS. ARIA labels are present on some components (the `HelpButton` uses `aria-label` and `aria-describedby`) but absent on others.

- **Color contrast not verified.** The design system uses Tailwind CSS custom properties for theming, but color contrast ratios have not been measured against WCAG 2.1 AA requirements (4.5:1 for normal text, 3:1 for large text). The muted-foreground color used for secondary text may fall below these thresholds.

- **Missing ARIA labels on data tables.** The `Table` component from the shared library renders semantic `<table>` HTML, but the EHR list components (order list, medication list, allergy list) do not add `aria-label` attributes to tables or use `<caption>` elements.

- **No skip navigation links.** The sidebar navigation does not include a "Skip to main content" link for keyboard users.

**Proposed fixes (prioritized):**

1. Conduct a full WCAG 2.1 AA audit using both automated tools (axe-core) and manual testing with screen readers.
2. Add `aria-label` attributes to all interactive elements and data tables in EHR components.
3. Verify and fix color contrast ratios across all themes.
4. Implement skip navigation links and ensure logical tab order.
5. Add automated accessibility testing to the CI pipeline using `@axe-core/playwright`.

---

## Moderate Gaps

### Onboarding (5/10)

The login flow works reliably across all three applications. The shared `LoginForm` component supports multiple authentication methods (email/password, token, userpass) and is consistently used. However, once a user logs in, there is no guidance.

**What works:**
- Login form is well-implemented with error handling and loading states.
- The admin dashboard has a setup flow (`setup.tsx` route).

**What is missing:**
- No first-time user walkthrough or product tour.
- No tooltips explaining what each section of the application does.
- No contextual help integrated into clinical workflows (the `HelpButton` and `HoverHelp` components exist in the library but are not deployed in the client application views).
- No "getting started" checklist for administrators setting up a new clinic.

### Navigation (6/10)

The file-based routing system with TanStack Router provides clean URL structures and reliable route transitions.

**What works:**
- Sidebar navigation covers all major sections: patients, scheduling, clinical, orders, results, pharmacy, billing, lab, radiology, OPD, IPD, wards, beds, OT, analytics, workflows, compliance, and settings.
- Patient detail view (`patients.$patientId.tsx`) properly nests under the patient list.
- The admin dashboard has separate routing from the client application.

**What is missing:**
- No breadcrumb navigation. When a clinician is three levels deep (Patients > John Doe > Lab Results), there is no visual breadcrumb trail to orient them or allow quick navigation back.
- No recent patients or recent views list for quick access.
- No keyboard shortcuts for common navigation actions.
- The action ribbon (`ActionRibbon.tsx`) provides quick actions but lacks contextual adaptation based on the current view.

### Data Entry (6/10)

Forms are functional and cover the necessary clinical data entry scenarios.

**What works:**
- The `FormBuilder` component supports a wide range of field types: text, email, number, tel, url, password, textarea, select, checkbox, radio, date, datetime-local, time, file, multiselect, switch, toggle, slider, rating, input-otp, combobox, display-text, and separator.
- Validation rules are defined per field (required, min/max, minLength/maxLength, pattern, custom validators).
- Layout system supports responsive grids with column/row spanning and customizable margins/padding.
- Clinical dialogs exist for key entry scenarios: `AddProblemDialog`, `AddMedicationDialog`, `AddVitalsDialog`, `AddAllergyDialog`, `OrderLabDialog`.

**What is missing:**
- No inline validation feedback. Errors appear only after form submission, not as the user types or moves between fields.
- No autosave or draft support. If a clinician is midway through a clinical note and accidentally navigates away, the work is lost.
- No confirmation dialogs for destructive actions (deleting a patient record, canceling an order).
- No smart defaults based on context (e.g., pre-filling the current date/time for encounter creation).

### Role-based UX (5/10)

The backend RBAC/ABAC system (via `authz-core`) supports fine-grained role and attribute-based access control. The frontend has `AccessDenied` and `PermissionLoading` components in the shared library. However, the UI does not adapt based on the user's role.

**What works:**
- Access denied states are handled (the `AccessDenied` component shows when a user lacks permissions).
- Permission loading states exist (the `PermissionLoading` component shows while permissions are being checked).

**What is missing:**
- All roles see the same sidebar navigation. A receptionist sees the same menu items as a physician, even though they cannot access most of them.
- No role-specific dashboard. A physician should see pending orders and critical results on login; a billing clerk should see outstanding invoices.
- No progressive disclosure based on role -- all features are visible, leading to a cluttered interface for non-clinical users.

### Clinical Workflow (6/10)

The clinical workflow components demonstrate a solid understanding of EHR patterns.

**What works:**
- `PatientBanner` displays patient demographics, age calculation, allergy warnings, and quick-access buttons in a format familiar to clinicians who have used VistA CPRS.
- EHR component set is comprehensive: `ProblemList`, `MedicationList`, `AllergyList`, `VitalSignsPanel`, `LabResultsPanel`, `VisitList`, `OrderList`, `DocumentList`, `AppointmentsList`.
- Clinical note support exists with dedicated components.
- Vital sign trending is available via `VitalTrendDialog`.
- Patient management includes duplicate checking (`PatientDuplicateCheckDialog`) and merge capabilities (`PatientMergeDialog`).
- Visual workflow designer components (`WorkflowDesigner`, `WorkflowNode`, `WorkflowToolbar`, `ConnectorConfig`) provide an n8n-style automation builder.

**What is missing:**
- No guided clinical workflow. When a clinician starts an encounter, there is no step-by-step guidance (chief complaint -> review vitals -> assessment -> orders -> note).
- No order sets or quick-order templates for common scenarios (e.g., "Annual Physical" order set that pre-selects CBC, CMP, lipid panel).
- No clinical decision support alerts (drug interaction warnings, allergy cross-reactivity alerts).
- No task list or "inbox" pattern for pending actions (unsigned notes, pending co-signatures, result reviews).

---

## Strengths

Despite the gaps identified above, the platform has notable strengths that provide a strong foundation for improvement:

1. **Shared component library.** The `@lazarus-life/ui-components` package at `cli/packages/libs/components/src/` provides a single source of truth for UI components across all three applications. This means improvements to components like `Skeleton`, `Alert`, or `ErrorBoundary` propagate to all apps automatically.

2. **PHI-aware error handling.** The `ErrorBoundary` component already sanitizes PHI patterns (email, SSN, phone, MRN, DOB) from error messages. This HIPAA-conscious approach needs to be extended to all error display paths, not just React rendering errors.

3. **Modern data fetching architecture.** TanStack Query is used consistently for server state management, which provides built-in support for caching, background refetching, loading states, error states, and optimistic updates. The infrastructure is present -- it needs to be leveraged more fully in the UI layer.

4. **Comprehensive form system.** The `FormBuilder` with its field type support, validation rules, and layout system is a strong foundation. Adding inline validation and autosave on top of this system is straightforward.

5. **Contextual help components.** The `HelpButton` and `HoverHelp` components are well-implemented with proper ARIA attributes and tooltip patterns. They just need to be deployed throughout the application.

6. **Healthcare domain coverage.** The EHR component set covers the core clinical data domains (problems, medications, allergies, vitals, labs, orders, documents, appointments) with dedicated display and entry components for each.

---

## Recommendations

The following recommendations are ordered by impact -- addressing the highest-impact items first will produce the largest improvement in clinician experience and patient safety.

### Priority 1: Patient Safety Impact (Weeks 1-4)

| Item | Category | Effort | Impact |
|---|---|---|---|
| Error translation layer for API errors | Error Handling | Medium | High |
| Success confirmations for all clinical mutations | User Feedback | Low | High |
| Skeleton loaders for patient list, vitals, orders | User Feedback | Low | High |
| Retry mechanisms for failed order submissions | Error Handling | Medium | High |
| Unsaved changes detection on clinical note forms | Data Entry | Medium | High |

### Priority 2: Clinician Productivity (Weeks 5-8)

| Item | Category | Effort | Impact |
|---|---|---|---|
| Breadcrumb navigation | Navigation | Low | Medium |
| Inline form validation | Data Entry | Medium | Medium |
| Role-specific sidebar filtering | Role-based UX | Medium | Medium |
| Guided encounter workflow | Clinical Workflow | High | Medium |
| Recent patients quick-access list | Navigation | Low | Medium |

### Priority 3: Compliance and Quality (Weeks 9-12)

| Item | Category | Effort | Impact |
|---|---|---|---|
| WCAG 2.1 AA audit and remediation | Accessibility | High | High |
| Automated accessibility CI checks | Accessibility | Medium | Medium |
| Role-specific dashboards | Role-based UX | High | Medium |
| First-time user onboarding tour | Onboarding | Medium | Low |
| Keyboard shortcuts for navigation | Navigation | Low | Low |

### Priority 4: Advanced Features (Weeks 13+)

| Item | Category | Effort | Impact |
|---|---|---|---|
| Optimistic updates for high-frequency operations | User Feedback | Medium | Medium |
| Clinical decision support alerts | Clinical Workflow | High | High |
| Order set templates | Clinical Workflow | High | Medium |
| Autosave / draft support for forms | Data Entry | High | Medium |
| Offline detection and graceful degradation | Error Handling | High | Medium |
| Clinical task inbox | Clinical Workflow | High | Medium |

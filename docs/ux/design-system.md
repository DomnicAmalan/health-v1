---
sidebar_position: 2
title: Design System
description: Component library, theming, and design patterns
---

# Design System

Health V1 uses a shared design system built on [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives + Tailwind CSS). The component library lives at `cli/packages/libs/components/src/` and is consumed by all three frontend applications: the client app, the admin dashboard, and the RustyVault UI. This ensures visual and behavioral consistency across the entire platform.

## Architecture

```
cli/packages/libs/components/src/
  components/         # UI components (shadcn/ui based)
  hooks/              # Shared React hooks
  lib/                # Utilities and form layout helpers
    formLayoutUtils/  # Grid, spacing, alignment, width, size utilities
  types/              # Shared type definitions (component registry)
  workflow/           # Visual workflow designer components
  index.ts            # Public API exports
```

The library is published as `@lazarus-life/ui-components` within the monorepo and imported in application code:

```typescript
import { Button, Card, Input, Dialog } from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
```

## Component Catalog

### Form Controls

These components handle user input and form interactions. All are built on Radix UI primitives with Tailwind CSS styling.

| Component | File | Description |
|---|---|---|
| `Input` | `components/input.tsx` | Text input with variants, supports all HTML input types |
| `Textarea` | `components/textarea.tsx` | Multi-line text input |
| `Checkbox` | `components/checkbox.tsx` | Checkbox with label support |
| `Select` | `components/select.tsx` | Dropdown select with Radix UI primitives |
| `Switch` | `components/switch.tsx` | Toggle switch for boolean values |
| `Label` | `components/label.tsx` | Form field label with required indicator support |
| `Button` | `components/button.tsx` | Button with size, variant, and loading state support |

### Form Builder System

The form builder is a configuration-driven form rendering system that supports dynamic form generation from JSON-like field configurations.

| Component | File | Description |
|---|---|---|
| `FormBuilder` | `components/form-builder.tsx` | Renders forms from `FormFieldConfig[]` arrays |
| `FormField` | `components/form-field.tsx` | Individual field renderer with validation |
| `FormCanvasPreview` | `components/form-canvas-preview.tsx` | Visual preview of form layouts |
| `FormPlayground` | `components/form-playground.tsx` | Interactive form builder with live preview |
| `FormPlaygroundWithResizer` | `components/form-playground-with-resizer.tsx` | Form playground with resizable panels |

**Supported field types:** text, email, number, tel, url, password, textarea, select, checkbox, radio, date, datetime-local, time, file, multiselect, switch, toggle, slider, rating, input-otp, combobox, display-text, and separator.

**Validation rules per field:**

```typescript
interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: (value: unknown) => string | true;
}
```

**Layout configuration per field:**

```typescript
interface FieldLayout {
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  rowSpan?: 1 | 2 | 3 | 4;
  order?: number;
  size?: "sm" | "md" | "lg" | "xl";
  width?: "auto" | "full" | "half" | "third" | "quarter" | string;
  margin?: { top?: Size; bottom?: Size; left?: Size; right?: Size };
  padding?: { top?: Size; bottom?: Size; left?: Size; right?: Size };
}
```

### Layout Components

Primitive layout components for building consistent page structures.

| Component | File | Description |
|---|---|---|
| `Box` | `components/box.tsx` | Generic container with flexible props |
| `Flex` | `components/flex.tsx` | Flexbox container with direction, alignment, gap control |
| `Stack` | `components/stack.tsx` | Vertical or horizontal stack with consistent spacing |
| `Container` | `components/container.tsx` | Max-width container for page content |
| `Separator` | `components/separator.tsx` | Visual divider between sections |
| `ScrollArea` | `components/scroll-area.tsx` | Custom scrollbar container (Radix primitive) |

### Data Display

Components for presenting data to users.

| Component | File | Description |
|---|---|---|
| `Card` | `components/card.tsx` | Card container with header, content, footer sections |
| `Table` | `components/table.tsx` | Semantic HTML table with styled header, body, rows, cells |
| `Badge` | `components/badge.tsx` | Status badges with color variants |
| `Avatar` | `components/avatar.tsx` | User avatar with fallback initials |
| `Progress` | `components/progress.tsx` | Progress bar indicator |
| `Skeleton` | `components/skeleton.tsx` | Loading placeholder with pulse animation |

### Overlay and Feedback

Components that appear on top of the main content.

| Component | File | Description |
|---|---|---|
| `Dialog` | `components/dialog.tsx` | Modal dialog with accessible focus trapping |
| `Alert` | `components/alert.tsx` | Inline alert banner with icon and description |
| `Tooltip` | `components/tooltip.tsx` | Hover tooltip with configurable position |
| `DropdownMenu` | `components/dropdown-menu.tsx` | Menu triggered by a button |
| `ContextMenu` | `components/context-menu.tsx` | Right-click context menu |
| `Tabs` | `components/tabs.tsx` | Tab navigation with content panels |

### Help and Guidance

Components designed to provide in-context help to users.

| Component | File | Description |
|---|---|---|
| `HelpButton` | `components/help-button.tsx` | Clickable help icon with tooltip content; supports `default`, `subtle`, and `icon-only` variants; sizes `sm`, `md`, `lg`; includes `aria-label` and `aria-describedby` |
| `HoverHelp` | `components/hover-help.tsx` | Info icon that appears on hover (e.g., in a card corner); positioned via `top-right`, `top-left`, `bottom-right`, `bottom-left`; fades in on parent `group-hover` |

### Security Components

Components for access control UI patterns.

| Component | File | Description |
|---|---|---|
| `AccessDenied` | `components/security/AccessDenied.tsx` | Full-page access denied state with explanation |
| `PermissionLoading` | `components/security/PermissionLoading.tsx` | Loading state while permissions are being evaluated |

### Authentication

| Component | File | Description |
|---|---|---|
| `LoginForm` | `components/login-form.tsx` | Configurable login form supporting multiple auth methods: `email-password`, `token`, `userpass`; shared across all three applications |

### Error Handling

| Component | File | Description |
|---|---|---|
| `ErrorBoundary` | `components/error-boundary.tsx` | React error boundary that catches rendering errors, sanitizes PHI from error messages (removes email, SSN, phone, MRN, DOB patterns), and displays a user-friendly fallback UI with a retry button |

### Component Registry

| Component | File | Description |
|---|---|---|
| `ComponentRegistry` | `components/component-registry.tsx` | Dynamic component registry for rendering components by type string; used by the FormBuilder to resolve field types to React components |

### Workflow Components

Visual workflow designer components for building n8n-style automation workflows.

| Component | File | Description |
|---|---|---|
| `WorkflowDesigner` | `workflow/WorkflowDesigner.tsx` | Main canvas for visually designing workflows with drag-and-drop nodes and connections |
| `WorkflowNodeComponent` | `workflow/WorkflowNode.tsx` | Individual workflow step node with input/output ports |
| `WorkflowToolbar` | `workflow/WorkflowToolbar.tsx` | Toolbar with controls for adding nodes, zooming, saving |
| `ConnectorConfig` | `workflow/ConnectorConfig.tsx` | Configuration panel for connector parameters and actions |

## Theming

### CSS Custom Properties

The design system uses CSS custom properties (CSS variables) for theming, following the shadcn/ui convention. These are defined in the application's global CSS and consumed by Tailwind CSS utility classes.

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}
```

Tailwind maps these variables to utility classes: `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`, and so on.

### Dark Mode

Dark mode is supported through a `.dark` class on the root element, which overrides the CSS custom properties with dark variants.

### Custom Transitions

The system includes custom transition utilities beyond the Tailwind defaults:

- `transition-fluent` -- A subtle Microsoft Fluent-inspired transition curve used on interactive elements like `HelpButton` and `HoverHelp`.
- `shadow-fluent-1` -- A Fluent Design-inspired subtle elevation shadow used on overlay elements.

## Typography

### Font Stack

The application uses the system font stack for optimal rendering across platforms:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, sans-serif;
```

### Scale

Text sizing follows Tailwind's default scale, with the following conventions used throughout the platform:

| Usage | Tailwind Class | Approximate Size |
|---|---|---|
| Page titles | `text-2xl font-bold` | 24px |
| Section headers | `text-lg font-semibold` | 18px |
| Card titles | `text-base font-semibold` | 16px |
| Body text | `text-sm` | 14px |
| Help text, captions | `text-xs text-muted-foreground` | 12px |
| Badge text | `text-xs font-medium` | 12px |

### Line Height

- Body content: `leading-relaxed` (1.625) for readability in clinical notes and documentation.
- Compact lists: `leading-normal` (1.5) for data tables and list items.
- Tooltips and help text: `leading-relaxed` (as specified in `HelpButton` and `HoverHelp`).

## Spacing

The design system follows Tailwind's spacing scale with these conventions:

| Context | Gap/Padding | Tailwind Class |
|---|---|---|
| Page padding | 24px | `p-6` |
| Card internal padding | 16px | `p-4` |
| Between sections | 24px | `gap-6` or `space-y-6` |
| Between form fields | 16px | `gap-4` or `space-y-4` |
| Between related elements | 8px | `gap-2` or `space-y-2` |
| Inline element spacing | 8px | `gap-2` |

### Form Layout Utilities

The `lib/formLayoutUtils/` module provides helper functions for consistent form layouts:

- `getAlignmentClasses()` -- Returns Tailwind classes for flex/grid alignment.
- `getGapClasses()` / `getGridColSpan()` / `getGridLayoutClasses()` -- Grid layout utilities.
- `getFieldSizeClasses()` -- Maps size tokens (`sm`, `md`, `lg`, `xl`) to Tailwind width classes.
- `getMarginClasses()` / `getPaddingClasses()` -- Maps spacing tokens to Tailwind classes.
- `getWidthClasses()` -- Maps width tokens (`auto`, `full`, `half`, `third`, `quarter`) to Tailwind classes.

## Color Usage

### Semantic Colors

| Purpose | CSS Variable | Usage |
|---|---|---|
| Page background | `--background` | Main content area |
| Primary actions | `--primary` | Buttons, links, active states |
| Destructive actions | `--destructive` | Delete buttons, critical alerts |
| Muted content | `--muted` | Background for secondary sections |
| Borders | `--border` | Dividers, input borders, card borders |
| Focus ring | `--ring` | Keyboard focus indicator |

### Healthcare-Specific Color Conventions

| Context | Color Pattern | Example |
|---|---|---|
| Critical alerts (allergies, drug interactions) | Red / destructive | `bg-destructive text-destructive-foreground` |
| Warning states (pending orders, unsigned notes) | Amber / yellow | `bg-yellow-50 text-yellow-800` |
| Success states (completed orders, signed notes) | Green | `bg-green-50 text-green-800` |
| Informational (help text, tooltips) | Blue / primary | `bg-blue-50 text-blue-800` |
| Inactive / disabled states | Gray / muted | `bg-muted text-muted-foreground` |

## Healthcare-Specific Patterns

### Patient Banner

The `PatientBanner` component (located in the client app at `src/components/ehr/PatientBanner.tsx`) is a persistent header that displays critical patient information during a clinical session. It follows the VistA CPRS banner pattern familiar to clinicians.

**Contents:**
- Patient name and demographics (age, sex)
- Date of birth (with PHI masking via `MaskedField` component)
- Contact information (phone, address)
- Allergy warnings with alert icon
- Quick-access buttons (View Chart, View Allergies)
- Loading skeleton when patient data is being fetched

**Usage:**
```tsx
<PatientBanner
  patient={selectedPatient}
  allergies={patientAllergies}
  isLoading={isLoading}
  onViewChart={() => navigate({ to: "/patients/$patientId", params: { patientId } })}
  onViewAllergies={() => setShowAllergies(true)}
/>
```

### Clinical Data Lists

The EHR component set provides standardized list views for clinical data. Each follows a consistent pattern: a card container with a header, a filterable/sortable table, and action buttons for adding new entries.

| Component | Data Domain | Actions |
|---|---|---|
| `ProblemList` | Active/inactive problems | Add via `AddProblemDialog` |
| `MedicationList` | Current medications | Add via `AddMedicationDialog` |
| `AllergyList` | Patient allergies | Add via `AddAllergyDialog` |
| `VitalSignsPanel` | Vital signs history | Add via `AddVitalsDialog`, trend via `VitalTrendDialog` |
| `LabResultsPanel` | Lab test results | Order via `OrderLabDialog` |
| `OrderList` | Active/completed orders | Order entry dialogs |
| `DocumentList` | Clinical documents | View/download |
| `AppointmentsList` | Scheduled appointments | Scheduling actions |
| `VisitList` | Encounter history | View details |

### Order Entry

Lab orders are entered through the `OrderLabDialog` component, which presents:
- Lab test selection from the service catalog
- Patient context (pre-filled from the current encounter)
- Priority selection (routine, urgent, stat)
- Special instructions field

### Clinical Notes

Clinical note components support creation and viewing of encounter documentation. Notes are associated with specific encounters and support multiple note types.

### Patient Management

Advanced patient management features include:
- `PatientFormDialog` -- Create and edit patient records.
- `PatientDuplicateCheckDialog` -- Check for potential duplicate patients before registration (implemented as part of RFC 0002).
- `PatientMergeDialog` -- Merge duplicate patient records with field-by-field selection (implemented as part of RFC 0002).
- `PatientSearch` / `PatientSearchDialog` -- Search patients by name, MRN, or other identifiers.
- `PatientActions` -- Contextual action menu for patient-level operations.

## Adding New Components

When adding a new component to the shared library:

1. Create the component file in `cli/packages/libs/components/src/components/`.
2. Follow the shadcn/ui pattern: use `React.forwardRef`, accept a `className` prop, and merge it with defaults using `cn()`.
3. Export the component from `cli/packages/libs/components/src/index.ts`.
4. Use CSS custom properties for theming rather than hardcoded colors.
5. Include proper TypeScript types for all props.
6. Add `aria-label` and other ARIA attributes for accessibility.

```typescript
import * as React from "react";
import { cn } from "../lib/utils";

export interface MyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outlined";
}

const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "base-classes-here",
          variant === "outlined" && "border border-border",
          className
        )}
        {...props}
      />
    );
  }
);
MyComponent.displayName = "MyComponent";

export { MyComponent };
```

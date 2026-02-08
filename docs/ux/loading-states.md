---
sidebar_position: 5
title: Loading States
description: Skeleton loaders and progress indicators
---

# Loading States

<!-- TODO: Implement loading state patterns and document usage -->

## Current State (3/10)

The UX audit identified minimal loading indicators as a critical gap.

## Proposed Patterns

### Skeleton Loaders

Use skeleton components for content that takes time to load:

- Patient list skeleton
- Clinical note skeleton
- Dashboard card skeleton

The component library includes a `Skeleton` component from shadcn/ui.

### Progress Indicators

- **Spinner** for short operations (< 2 seconds)
- **Progress bar** for operations with known duration (file uploads, batch operations)
- **Skeleton screens** for page/section loading (> 500ms)

### TanStack Query Integration

Leverage TanStack Query's loading states:

```typescript
const { data, isLoading, isFetching } = useQuery({
  queryKey: ['patients'],
  queryFn: fetchPatients,
});

if (isLoading) return <PatientListSkeleton />;
```

# RFC-Based Feature Building Skill

Build features following RFC (Request for Comments) design process with research-first implementation.

## What This Skill Does

1. Analyzes existing codebase before implementation
2. Creates or uses RFC document for feature design
3. Validates approach against existing patterns
4. Implements feature following established conventions
5. Documents decisions and trade-offs

## RFC Process Flow

```
1. Research Phase    → Understand existing code
2. Design Phase      → Create RFC document
3. Review Phase      → Validate approach
4. Implementation    → Build following RFC
5. Verification      → Test and document
```

## Execution Steps

### Step 1: Research Existing Code

Before ANY implementation, always research:

```
RESEARCH CHECKLIST:
□ Similar features already implemented?
□ Existing patterns for this type of feature?
□ Shared utilities that can be reused?
□ Related database schemas?
□ API conventions in use?
□ Type definitions that apply?
□ Test patterns to follow?
```

Key areas to check:

**Backend (Rust)**:
- `backend/shared/src/` - Common types, error handling
- `backend/api-service/src/presentation/` - API handlers
- `backend/*/src/use_cases/` - Business logic patterns

**Frontend (TypeScript/React)**:
- `cli/packages/libs/shared/src/` - Shared types, schemas, API routes
- `cli/packages/libs/components/src/` - UI components
- `cli/packages/apps/*/src/hooks/` - Data fetching patterns

### Step 2: Create RFC Document

If feature is non-trivial, create RFC:

**Location**: `docs/rfcs/NNNN-feature-name.md`

**To create a new RFC**:
```bash
# Get next RFC number
ls docs/rfcs/*.md | tail -1

# Copy template
cp docs/rfcs/0001-rfc-template.md docs/rfcs/NNNN-feature-name.md
```

**RFC Template**:

```markdown
# RFC NNNN: Feature Name

## Status
Draft | Under Review | Accepted | Implemented | Rejected

## Summary
One paragraph explanation of the feature.

## Motivation
Why are we doing this? What use cases does it support?

## Research Findings

### Existing Patterns Found
- [Pattern 1]: Found in `path/to/file.ts`
- [Pattern 2]: Found in `path/to/file.rs`

### Reusable Components
- [Component/Utility 1]: Can be reused for X
- [Component/Utility 2]: Needs extension for Y

### Similar Implementations
- [Feature X]: Uses approach A (pros/cons)
- [Feature Y]: Uses approach B (pros/cons)

## Detailed Design

### API Design
```typescript
// Request/Response types
interface CreateOrderRequest { ... }
interface OrderResponse { ... }
```

### Database Schema
```sql
CREATE TABLE orders ( ... );
```

### Component Structure
```
src/features/orders/
├── components/
├── hooks/
├── types/
└── utils/
```

## Implementation Plan

### Phase 1: Foundation
- [ ] Task 1
- [ ] Task 2

### Phase 2: Core Feature
- [ ] Task 3
- [ ] Task 4

### Phase 3: Polish
- [ ] Task 5
- [ ] Task 6

## Alternatives Considered
What other designs were considered? Why were they rejected?

## Security Considerations
PHI handling, authentication, authorization requirements.

## Testing Strategy
Unit tests, integration tests, E2E tests needed.

## Open Questions
- Question 1?
- Question 2?
```

### Step 3: Validate Design

Before implementing, verify:

1. **Pattern Alignment**: Does design match existing patterns?
2. **Type Consistency**: Are types consistent with shared schemas?
3. **API Conventions**: Does API follow existing route patterns?
4. **Component Reuse**: Are shared components being used?
5. **Error Handling**: Using AppError/proper error types?

### Step 4: Implement Feature

Follow the RFC implementation plan:

**For Backend**:
1. Add types to `shared/src/`
2. Create use case in service
3. Add handler in presentation layer
4. Add routes
5. Add tests

**For Frontend**:
1. Add types/schemas to `@lazarus-life/shared`
2. Add API routes to routes.ts
3. Create hooks for data fetching
4. Build UI components
5. Add tests

### Step 5: Verification

After implementation:

```bash
# Run all tests
make test

# Type check
make check-types

# Lint
make lint

# Verify no regressions
make check
```

Update RFC status to "Implemented".

## Research Commands

Quick codebase exploration:

```bash
# Find similar patterns (backend)
grep -r "pattern" backend/

# Find type definitions (frontend)
grep -r "interface.*Name" cli/packages/libs/shared/

# Find existing hooks
ls cli/packages/apps/*/src/hooks/

# Find API routes
cat cli/packages/libs/shared/src/api/routes.ts
```

## Anti-Patterns to Avoid

1. **No Research**: Implementing without checking existing code
2. **Duplicate Code**: Creating new utilities when shared ones exist
3. **Inconsistent Patterns**: Using different patterns than established
4. **Missing Types**: Not adding types to shared library
5. **Skipping RFC**: Building complex features without design doc

## Output Format

When using this skill, provide:

```
RFC FEATURE ANALYSIS
====================
Feature: [Feature Name]
Date: [current date]

RESEARCH FINDINGS:
- Existing patterns: [list]
- Reusable code: [list]
- Similar features: [list]

DESIGN DECISIONS:
- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

IMPLEMENTATION PLAN:
1. [Step 1]
2. [Step 2]
3. ...

FILES TO CREATE/MODIFY:
- [file path]: [purpose]
- [file path]: [purpose]

ESTIMATED SCOPE:
- New files: [count]
- Modified files: [count]
- Test files: [count]
```

## Integration with Versioning

For significant features:
1. Feature should be in RFC before minor version bump
2. Breaking changes require major version bump
3. Update CHANGELOG.md with feature description

# RFC Implementation Skill

Implement features from approved RFCs following Google's design doc methodology with phased execution.

## What This Skill Does

1. Reads and parses the specified RFC document
2. Creates implementation tasks from the RFC plan
3. Executes each phase with verification gates
4. Updates RFC status and changelog
5. Ensures code follows existing patterns

## Prerequisites

- RFC document exists in `docs/rfcs/`
- RFC status is "Accepted" or "Draft" (for development)
- Codebase context understood

## Google Design Doc Methodology

This skill follows Google's engineering practices:

1. **Context** - Understand existing code before writing new code
2. **Goals/Non-Goals** - Clear scope boundaries
3. **Design** - Detailed implementation plan
4. **Alternatives** - Document what was considered
5. **Cross-cutting concerns** - Security, monitoring, testing

## Execution Steps

### Step 1: Parse RFC Document

```bash
# Read the RFC
cat docs/rfcs/NNNN-feature-name.md
```

Extract key sections:
- **Implementation Plan** → Task list
- **Detailed Design** → Code patterns to follow
- **Testing Strategy** → Test requirements
- **Open Questions** → Items needing clarification

### Step 2: Create Task Breakdown

For each phase in the RFC, create granular tasks:

```
RFC Phase → Implementation Tasks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1: Foundation
├── Task 1.1: Create types/schemas
├── Task 1.2: Add database migration
├── Task 1.3: Implement repository
└── Task 1.4: Add unit tests

Phase 2: Core Feature
├── Task 2.1: Create API handlers
├── Task 2.2: Add routes
├── Task 2.3: Create hooks (frontend)
└── Task 2.4: Add integration tests
```

### Step 3: Pre-Implementation Checklist

Before writing code, verify:

```
PRE-IMPLEMENTATION CHECKLIST
============================
□ Read all files mentioned in RFC "Existing Patterns"
□ Verify database tables exist (or create migration)
□ Check shared types exist (or add to @lazarus-life/shared)
□ Identify test patterns from similar features
□ Confirm API route conventions (/v1/ prefix, etc.)
```

### Step 4: Implementation Pattern

For each task:

```
1. READ existing similar code first
2. UNDERSTAND the pattern being used
3. IMPLEMENT following the same pattern
4. TEST with both valid and invalid cases
5. VERIFY no regressions (make test)
```

**Code Quality Gates (Tiger Style):**
- [ ] No `unwrap()` or `expect()` in production code
- [ ] Minimum 2 assertions per function
- [ ] Function < 70 lines
- [ ] All queries have timeouts
- [ ] Tests cover valid/invalid boundaries

### Step 5: Phase Completion Gates

After each RFC phase:

```bash
# Run all checks
make check

# Verify specific area
make test-backend  # If backend changes
make test-unit     # If frontend changes

# Type check
make check-types
```

Only proceed to next phase if all gates pass.

### Step 6: Update RFC Status

After implementation:

```markdown
## Metadata
| Field | Value |
|-------|-------|
| Status | Implemented |  ← Update this
| Implemented In | v1.5.0 |  ← Add version
```

Add to changelog section:
```markdown
## Changelog
| Date | Author | Changes |
|------|--------|---------|
| 2026-02-06 | Team | Implemented Phase 1 |
| 2026-02-07 | Team | Implemented Phase 2 |
```

### Step 7: Update Project CHANGELOG

Add entry to root `CHANGELOG.md`:

```markdown
## [Unreleased]

### Added
- Patient duplicate detection (RFC 0002)
- Patient merge functionality (RFC 0002)
```

## Implementation Patterns by Domain

### Backend (Rust) Pattern

```rust
// 1. Add types to shared/src/domain/entities/
pub struct NewEntity {
    pub id: Uuid,
    // fields...
}

// 2. Add repository trait to shared/src/domain/repositories/
#[async_trait]
pub trait NewEntityRepository: Send + Sync {
    async fn create(&self, entity: &NewEntity) -> Result<NewEntity, AppError>;
    async fn get(&self, id: Uuid) -> Result<Option<NewEntity>, AppError>;
    // ...
}

// 3. Implement repository in shared/src/infrastructure/repositories/
pub struct PostgresNewEntityRepository { pool: PgPool }

// 4. Add handlers in api-service/src/presentation/api/handlers/
pub async fn create_entity(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateEntityRequest>,
) -> Result<Json<EntityResponse>, AppError> {
    // Implementation
}

// 5. Add routes in api-service/src/presentation/api/routes.rs
.route("/v1/entities", post(create_entity))
```

### Frontend (TypeScript/React) Pattern

```typescript
// 1. Add schemas to @lazarus-life/shared/src/schemas/
export const EntitySchema = z.object({
  id: z.string().uuid(),
  // fields...
});

// 2. Add API routes to @lazarus-life/shared/src/api/routes.ts
entities: {
  list: '/v1/entities',
  create: '/v1/entities',
  get: (id: string) => `/v1/entities/${id}`,
}

// 3. Create hooks in app/src/hooks/api/
export function useEntities() {
  return useQuery({
    queryKey: entityKeys.list(),
    queryFn: () => apiClient.get(routes.entities.list),
  });
}

// 4. Create components in app/src/components/
export function EntityList() {
  const { data, isLoading } = useEntities();
  // ...
}
```

## Database Migration Pattern

```sql
-- migrations/NNNN_description.up.sql

-- 1. Create table
CREATE TABLE IF NOT EXISTS new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- columns...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Add indexes
CREATE INDEX idx_new_table_field ON new_table(field);

-- 3. Add constraints
ALTER TABLE new_table ADD CONSTRAINT fk_parent
    FOREIGN KEY (parent_id) REFERENCES parent_table(id);

-- 4. Add triggers
CREATE TRIGGER update_new_table_updated_at
    BEFORE UPDATE ON new_table
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Error Handling Pattern

```rust
// Always use Result, never panic
pub async fn handler() -> Result<Json<Response>, AppError> {
    // Validate input
    let entity = get_entity(id).await?
        .ok_or(AppError::NotFound("Entity not found".into()))?;

    // Business logic with proper error context
    let result = process(entity)
        .map_err(|e| AppError::Internal(format!("Processing failed: {}", e)))?;

    Ok(Json(result))
}
```

## Test Pattern

```rust
#[tokio::test]
async fn test_feature_valid_input() {
    // Arrange
    let input = create_valid_input();

    // Act
    let result = feature_function(input).await;

    // Assert
    assert!(result.is_ok());
    assert_eq!(result.unwrap().field, expected_value);
}

#[tokio::test]
async fn test_feature_invalid_input() {
    // Test boundary: invalid input should fail gracefully
    let input = create_invalid_input();
    let result = feature_function(input).await;
    assert!(result.is_err());
}
```

## Output Format

When implementing an RFC:

```
RFC IMPLEMENTATION PROGRESS
===========================
RFC: 0002 - Patient & Workflow Improvements
Target Version: 1.5.0
Current Phase: 2 of 4

COMPLETED TASKS:
✓ 1.1 Fix banner counts query
✓ 1.2 Add duplicate detection function
✓ 1.3 Implement patient merge handler

IN PROGRESS:
→ 2.1 Create patient forms (frontend)

REMAINING:
○ 2.2 Add E2E tests
○ 3.1 State machine framework
○ ...

VERIFICATION STATUS:
- Tests: ✓ Passing
- Lint: ✓ Clean
- Types: ✓ Valid

NEXT STEP:
Implementing CreatePatientForm component following
existing FormBuilder pattern in @lazarus-life/ui-components
```

## Integration with Version Control

After completing an RFC:

```bash
# Create feature branch (if not already)
git checkout -b feat/rfc-0002-patient-workflow

# Commit with RFC reference
git commit -m "feat(patient): implement duplicate detection (RFC 0002)"

# When RFC fully implemented
make release-minor  # Bump version

# Update RFC with implemented version
```

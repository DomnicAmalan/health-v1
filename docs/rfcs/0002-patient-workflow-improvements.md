# RFC 0002: Patient Module & Workflow Engine Improvements

## Metadata

| Field | Value |
|-------|-------|
| RFC | 0002 |
| Title | Patient Module & Workflow Engine Improvements |
| Status | In Progress |
| Created | 2026-02-06 |
| Author | Health V1 Team |
| Target Version | 1.5.0 |

## Summary

Enhance the patient module with missing features (banner counts, merge, duplicate detection) and complete the workflow engine implementation with proper persistence, event bus, and state machine framework.

## Motivation

1. **Patient Banner**: Currently shows hardcoded zeros for counts - critical for clinician workflow
2. **Patient Merge**: Duplicate patients are common in healthcare - need resolution workflow
3. **Workflow Engine**: Foundation exists but needs persistence layer for production use
4. **State Machines**: Each entity reimplements state logic - need generic framework

## Research Findings

### Existing Patterns Found
- Patient handlers: `backend/api-service/src/presentation/api/handlers/ehr/patient_handlers.rs`
- Workflow engine: `backend/shared/src/application/services/workflow_engine.rs`
- Rules engine: `backend/shared/src/application/services/rules_engine.rs`
- Status enums in all EHR entities with transition methods

### Database Tables Ready
- `ehr_patients` with merge history support
- `workflows`, `workflow_instances`, `workflow_tasks`, `workflow_events`
- `opd_queue` with status transitions

## Detailed Design

### Phase 1: Patient Module Completion

#### 1.1 Fix Patient Banner Counts

```rust
// backend/api-service/src/presentation/api/handlers/ehr/patient_handlers.rs

pub async fn get_patient_banner(
    State(pool): State<PgPool>,
    Path(patient_id): Path<Uuid>,
) -> Result<Json<PatientBannerResponse>, AppError> {
    let patient = sqlx::query_as!(PatientRow, "SELECT * FROM ehr_patients WHERE id = $1", patient_id)
        .fetch_optional(&pool)
        .await?
        .ok_or(AppError::NotFound("Patient not found".into()))?;

    // Query actual counts
    let allergies_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM drug_allergies WHERE patient_id = $1 AND status = 'active'",
        patient_id
    ).fetch_one(&pool).await?.unwrap_or(0);

    let problems_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM problem_list WHERE patient_id = $1 AND status = 'active'",
        patient_id
    ).fetch_one(&pool).await?.unwrap_or(0);

    let medications_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM prescriptions WHERE patient_id = $1 AND status = 'active'",
        patient_id
    ).fetch_one(&pool).await?.unwrap_or(0);

    let last_visit = sqlx::query_scalar!(
        "SELECT MAX(encounter_date) FROM encounters WHERE patient_id = $1",
        patient_id
    ).fetch_one(&pool).await?;

    Ok(Json(PatientBannerResponse {
        id: patient.id,
        full_name: format_patient_name(&patient),
        mrn: patient.mrn,
        date_of_birth: patient.date_of_birth,
        age: patient.age,
        sex: patient.sex,
        allergies_count: allergies_count as i32,
        active_problems_count: problems_count as i32,
        active_medications_count: medications_count as i32,
        last_visit_date: last_visit,
        photo_url: patient.photo_url,
        is_vip: patient.is_vip,
        has_alerts: patient.confidential_flag,
    }))
}
```

#### 1.2 Patient Duplicate Detection

```sql
-- New function for duplicate detection
CREATE OR REPLACE FUNCTION find_potential_duplicates(
    p_first_name VARCHAR,
    p_last_name VARCHAR,
    p_date_of_birth DATE,
    p_ssn_last_four VARCHAR DEFAULT NULL
) RETURNS TABLE (
    patient_id UUID,
    match_score INTEGER,
    match_reasons TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        (
            CASE WHEN LOWER(p.first_name) = LOWER(p_first_name) THEN 30 ELSE 0 END +
            CASE WHEN LOWER(p.last_name) = LOWER(p_last_name) THEN 30 ELSE 0 END +
            CASE WHEN p.date_of_birth = p_date_of_birth THEN 30 ELSE 0 END +
            CASE WHEN p_ssn_last_four IS NOT NULL AND p.ssn_last_four = p_ssn_last_four THEN 10 ELSE 0 END
        ) as score,
        ARRAY_REMOVE(ARRAY[
            CASE WHEN LOWER(p.first_name) = LOWER(p_first_name) THEN 'first_name' END,
            CASE WHEN LOWER(p.last_name) = LOWER(p_last_name) THEN 'last_name' END,
            CASE WHEN p.date_of_birth = p_date_of_birth THEN 'dob' END,
            CASE WHEN p_ssn_last_four IS NOT NULL AND p.ssn_last_four = p_ssn_last_four THEN 'ssn' END
        ], NULL) as reasons
    FROM ehr_patients p
    WHERE p.status != 'merged'
    AND (
        (LOWER(p.first_name) = LOWER(p_first_name) AND LOWER(p.last_name) = LOWER(p_last_name))
        OR p.date_of_birth = p_date_of_birth
        OR (p_ssn_last_four IS NOT NULL AND p.ssn_last_four = p_ssn_last_four)
    )
    ORDER BY score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;
```

#### 1.3 Patient Merge Handler

```rust
// New handler for patient merge
pub async fn merge_patients(
    State(pool): State<PgPool>,
    Json(payload): Json<MergePatientsRequest>,
) -> Result<Json<PatientResponse>, AppError> {
    let mut tx = pool.begin().await?;

    // Validate both patients exist
    let survivor = get_patient_by_id(&mut tx, payload.survivor_id).await?;
    let duplicate = get_patient_by_id(&mut tx, payload.duplicate_id).await?;

    // Move all related records to survivor
    sqlx::query!("UPDATE encounters SET patient_id = $1 WHERE patient_id = $2",
        payload.survivor_id, payload.duplicate_id)
        .execute(&mut *tx).await?;

    sqlx::query!("UPDATE appointments SET patient_id = $1 WHERE patient_id = $2",
        payload.survivor_id, payload.duplicate_id)
        .execute(&mut *tx).await?;

    // ... repeat for all related tables

    // Record merge history
    sqlx::query!(
        "INSERT INTO patient_merge_history (survivor_id, merged_id, merged_by, merge_reason)
         VALUES ($1, $2, $3, $4)",
        payload.survivor_id, payload.duplicate_id, payload.merged_by, payload.reason
    ).execute(&mut *tx).await?;

    // Mark duplicate as merged
    sqlx::query!(
        "UPDATE ehr_patients SET status = 'merged', merged_into_id = $1 WHERE id = $2",
        payload.survivor_id, payload.duplicate_id
    ).execute(&mut *tx).await?;

    tx.commit().await?;

    Ok(Json(survivor.into()))
}
```

### Phase 2: State Machine Framework

#### 2.1 Generic State Machine Trait

```rust
// backend/shared/src/domain/state_machine.rs

use std::collections::HashMap;
use std::fmt::Debug;

pub trait State: Clone + Eq + std::hash::Hash + Debug {}
pub trait Event: Clone + Debug {}

pub struct Transition<S: State, E: Event> {
    pub from: S,
    pub event: E,
    pub to: S,
    pub guard: Option<Box<dyn Fn() -> bool + Send + Sync>>,
    pub action: Option<Box<dyn Fn() + Send + Sync>>,
}

pub struct StateMachine<S: State, E: Event> {
    current_state: S,
    transitions: HashMap<(S, E), Transition<S, E>>,
    history: Vec<(S, E, S)>,
}

impl<S: State, E: Event> StateMachine<S, E> {
    pub fn new(initial_state: S) -> Self {
        Self {
            current_state: initial_state,
            transitions: HashMap::new(),
            history: Vec::new(),
        }
    }

    pub fn add_transition(&mut self, transition: Transition<S, E>) {
        self.transitions.insert(
            (transition.from.clone(), transition.event.clone()),
            transition,
        );
    }

    pub fn can_transition(&self, event: &E) -> bool {
        if let Some(transition) = self.transitions.get(&(self.current_state.clone(), event.clone())) {
            if let Some(guard) = &transition.guard {
                return guard();
            }
            return true;
        }
        false
    }

    pub fn transition(&mut self, event: E) -> Result<S, StateMachineError> {
        let key = (self.current_state.clone(), event.clone());

        let transition = self.transitions.get(&key)
            .ok_or(StateMachineError::InvalidTransition)?;

        if let Some(guard) = &transition.guard {
            if !guard() {
                return Err(StateMachineError::GuardFailed);
            }
        }

        let old_state = self.current_state.clone();
        self.current_state = transition.to.clone();

        if let Some(action) = &transition.action {
            action();
        }

        self.history.push((old_state, event, self.current_state.clone()));

        Ok(self.current_state.clone())
    }

    pub fn current(&self) -> &S {
        &self.current_state
    }
}
```

#### 2.2 Appointment State Machine Example

```rust
// Using the generic state machine for appointments

#[derive(Clone, Eq, PartialEq, Hash, Debug)]
pub enum AppointmentState {
    Scheduled,
    Confirmed,
    CheckedIn,
    InRoom,
    Completed,
    Cancelled,
    NoShow,
}
impl State for AppointmentState {}

#[derive(Clone, Debug)]
pub enum AppointmentEvent {
    Confirm,
    CheckIn,
    MoveToRoom,
    Complete,
    Cancel { reason: String },
    MarkNoShow,
}
impl Event for AppointmentEvent {}

pub fn create_appointment_state_machine() -> StateMachine<AppointmentState, AppointmentEvent> {
    let mut sm = StateMachine::new(AppointmentState::Scheduled);

    sm.add_transition(Transition {
        from: AppointmentState::Scheduled,
        event: AppointmentEvent::Confirm,
        to: AppointmentState::Confirmed,
        guard: None,
        action: Some(Box::new(|| { /* Send confirmation */ })),
    });

    sm.add_transition(Transition {
        from: AppointmentState::Confirmed,
        event: AppointmentEvent::CheckIn,
        to: AppointmentState::CheckedIn,
        guard: None,
        action: Some(Box::new(|| { /* Add to queue */ })),
    });

    // ... more transitions

    sm
}
```

### Phase 3: Workflow Engine Persistence

#### 3.1 Workflow Repository

```rust
// backend/shared/src/infrastructure/repositories/workflow_repository.rs

#[async_trait]
pub trait WorkflowRepository: Send + Sync {
    async fn save_definition(&self, workflow: &WorkflowDefinition) -> Result<(), AppError>;
    async fn get_definition(&self, id: Uuid) -> Result<Option<WorkflowDefinition>, AppError>;
    async fn list_definitions(&self, org_id: Uuid) -> Result<Vec<WorkflowDefinition>, AppError>;

    async fn save_instance(&self, instance: &WorkflowInstance) -> Result<(), AppError>;
    async fn get_instance(&self, id: Uuid) -> Result<Option<WorkflowInstance>, AppError>;
    async fn update_instance_state(&self, id: Uuid, state: WorkflowState) -> Result<(), AppError>;

    async fn create_task(&self, task: &WorkflowTask) -> Result<(), AppError>;
    async fn claim_task(&self, task_id: Uuid, user_id: Uuid) -> Result<(), AppError>;
    async fn complete_task(&self, task_id: Uuid, output: Value) -> Result<(), AppError>;

    async fn emit_event(&self, event: &WorkflowEvent) -> Result<(), AppError>;
    async fn get_pending_events(&self, limit: i32) -> Result<Vec<WorkflowEvent>, AppError>;
}

pub struct PostgresWorkflowRepository {
    pool: PgPool,
}

#[async_trait]
impl WorkflowRepository for PostgresWorkflowRepository {
    async fn save_instance(&self, instance: &WorkflowInstance) -> Result<(), AppError> {
        sqlx::query!(
            r#"
            INSERT INTO workflow_instances (id, workflow_id, status, current_node_id, context, started_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                current_node_id = EXCLUDED.current_node_id,
                context = EXCLUDED.context,
                updated_at = NOW()
            "#,
            instance.id,
            instance.workflow_id,
            instance.status.to_string(),
            instance.current_node_id,
            instance.context,
            instance.started_at
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // ... other implementations
}
```

### Phase 4: Event Bus

#### 4.1 Event Bus Implementation

```rust
// backend/shared/src/infrastructure/events/event_bus.rs

pub struct Event {
    pub id: Uuid,
    pub event_type: String,
    pub payload: Value,
    pub created_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
}

#[async_trait]
pub trait EventHandler: Send + Sync {
    fn event_type(&self) -> &str;
    async fn handle(&self, event: &Event) -> Result<(), AppError>;
}

pub struct EventBus {
    handlers: HashMap<String, Vec<Arc<dyn EventHandler>>>,
    repository: Arc<dyn WorkflowRepository>,
}

impl EventBus {
    pub fn register<H: EventHandler + 'static>(&mut self, handler: H) {
        let event_type = handler.event_type().to_string();
        self.handlers
            .entry(event_type)
            .or_insert_with(Vec::new)
            .push(Arc::new(handler));
    }

    pub async fn emit(&self, event_type: &str, payload: Value) -> Result<Uuid, AppError> {
        let event = Event {
            id: Uuid::new_v4(),
            event_type: event_type.to_string(),
            payload,
            created_at: Utc::now(),
            processed_at: None,
        };

        // Persist event first (guaranteed delivery)
        self.repository.emit_event(&event.into()).await?;

        // Process handlers
        if let Some(handlers) = self.handlers.get(event_type) {
            for handler in handlers {
                handler.handle(&event).await?;
            }
        }

        Ok(event.id)
    }

    pub async fn process_pending(&self, batch_size: i32) -> Result<usize, AppError> {
        let events = self.repository.get_pending_events(batch_size).await?;
        let count = events.len();

        for event in events {
            if let Some(handlers) = self.handlers.get(&event.event_type) {
                for handler in handlers {
                    handler.handle(&event.into()).await?;
                }
            }
            // Mark as processed
            self.repository.mark_event_processed(event.id).await?;
        }

        Ok(count)
    }
}
```

## Implementation Plan

### Phase 1: Patient Module (Week 1-2)
- [x] Fix banner counts query (queries allergies, problems, medications, last visit)
- [x] Add duplicate detection handler (POST /v1/ehr/patients/find-duplicates)
- [x] Implement patient merge handler (POST /v1/ehr/patients/merge)
- [x] Create patient create/edit forms (frontend) - PatientFormDialog
- [x] Create duplicate detection UI (frontend) - PatientDuplicateCheckDialog
- [x] Create patient merge UI (frontend) - PatientMergeDialog
- [x] Add frontend hooks: useFindDuplicatePatients, useMergePatients
- [ ] Add E2E tests for patient flows

### Phase 2: State Machine Framework (Week 3)
- [x] Create generic StateMachine trait (`state_machine!` proc macro)
- [x] Create configurable/database-driven workflow system
- [x] Implement AppointmentStateMachine with guards/actions
- [x] Implement OrderStateMachine with guards/actions
- [x] Add database schema for workflow_definitions, workflow_states, workflow_transitions
- [x] Add guard evaluation (time_check, field_check, permission_check)
- [x] Add role-based transition access control
- [ ] Migrate existing appointment handlers to use framework
- [ ] Migrate existing order handlers to use framework

### Phase 3: Workflow Persistence (Week 4)
- [ ] Create WorkflowRepository trait
- [ ] Implement PostgresWorkflowRepository
- [ ] Update WorkflowEngine to use repository
- [ ] Add workflow state recovery on restart

### Phase 4: Event Bus (Week 5)
- [ ] Create EventBus with handler registry
- [ ] Implement persistent event storage
- [ ] Add event processing worker
- [ ] Create workflow trigger events

### Phase 5: Integration & Testing (Week 6)
- [ ] Integration tests for workflows
- [ ] Performance testing for event bus
- [ ] Documentation and examples

## Testing Strategy

### Unit Tests
- State machine transitions
- Event bus handler registration
- Duplicate detection scoring

### Integration Tests
- Patient merge with all related entities
- Workflow execution end-to-end
- Event bus guaranteed delivery

### E2E Tests
- Patient search and merge flow
- Appointment workflow (schedule → complete)
- Order workflow with rules engine

## Open Questions

- [ ] Should workflow execution be synchronous or async (job queue)?
- [ ] What SLA thresholds for task escalation?
- [ ] Should we support workflow versioning (running old vs new versions)?

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-06 | Team | Initial draft |
| 2026-02-06 | Team | Implemented Phase 1 backend: banner counts, duplicate detection, patient merge |
| 2026-02-06 | Team | Implemented Phase 1 frontend: PatientFormDialog, PatientMergeDialog, PatientDuplicateCheckDialog, hooks |

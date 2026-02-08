-- ============================================================================
-- Configurable Workflow System
-- Allows per-hospital/organization workflow customization
-- ============================================================================

-- Workflow entity types (what can have workflows)
CREATE TYPE workflow_entity_type AS ENUM (
    'appointment',
    'lab_order',
    'imaging_order',
    'prescription',
    'admission',
    'encounter',
    'referral',
    'surgery'
);

-- Workflow definitions per organization
CREATE TABLE workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- What entity this workflow applies to
    entity_type workflow_entity_type NOT NULL,

    -- Workflow metadata
    name VARCHAR(100) NOT NULL,
    description TEXT,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID
);

-- Only one default workflow per entity type per org (partial unique index)
CREATE UNIQUE INDEX idx_unique_default_workflow
    ON workflow_definitions (organization_id, entity_type)
    WHERE (is_default = true);

-- States within a workflow
CREATE TABLE workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,

    -- State identifier (used in code)
    code VARCHAR(50) NOT NULL,
    -- Display name
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- State properties
    is_initial BOOLEAN NOT NULL DEFAULT false,
    is_terminal BOOLEAN NOT NULL DEFAULT false,

    -- UI customization
    color VARCHAR(20),  -- e.g., "green", "#00ff00"
    icon VARCHAR(50),   -- e.g., "check", "clock"

    -- Order for display
    display_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Code must be unique within workflow
    CONSTRAINT unique_state_code UNIQUE (workflow_id, code)
);

-- Only one initial state per workflow (partial unique index)
CREATE UNIQUE INDEX idx_unique_initial_state
    ON workflow_states (workflow_id)
    WHERE (is_initial = true);

-- Transitions between states
CREATE TABLE workflow_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,

    -- From/To states
    from_state_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,
    to_state_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,

    -- Event that triggers this transition
    event_code VARCHAR(50) NOT NULL,
    event_name VARCHAR(100) NOT NULL,

    -- Guard conditions (evaluated at runtime)
    -- JSON array of conditions: [{"type": "time_check", "params": {"min_hours_before": 2}}]
    guard_conditions JSONB,

    -- Actions to execute on transition
    -- JSON array of actions: [{"type": "send_notification", "params": {"template": "checkin"}}]
    actions JSONB,

    -- Required permissions to execute this transition
    required_permissions VARCHAR(100)[],

    -- Roles that can execute this transition (if empty, all roles)
    allowed_roles VARCHAR(100)[],

    -- UI customization
    button_label VARCHAR(50),
    button_color VARCHAR(20),
    confirm_message TEXT,  -- If set, show confirmation dialog

    -- Is this transition available via API?
    is_api_enabled BOOLEAN NOT NULL DEFAULT true,
    -- Is this transition shown in UI?
    is_ui_enabled BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique transition per workflow
    CONSTRAINT unique_transition UNIQUE (workflow_id, from_state_id, event_code)
);

-- Audit log for state transitions
CREATE TABLE workflow_transition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,

    -- What changed
    entity_type workflow_entity_type NOT NULL,
    entity_id UUID NOT NULL,

    -- Transition details
    workflow_id UUID REFERENCES workflow_definitions(id),
    from_state VARCHAR(50) NOT NULL,
    to_state VARCHAR(50) NOT NULL,
    event_code VARCHAR(50) NOT NULL,

    -- Who/When
    transitioned_by UUID,
    transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Context (PHI-safe metadata)
    context JSONB,

    -- IP/User agent for security audit
    ip_address INET,
    user_agent TEXT
);

-- Indexes for performance
CREATE INDEX idx_workflow_def_org ON workflow_definitions(organization_id);
CREATE INDEX idx_workflow_def_entity ON workflow_definitions(organization_id, entity_type);
CREATE INDEX idx_workflow_states_workflow ON workflow_states(workflow_id);
CREATE INDEX idx_workflow_transitions_workflow ON workflow_transitions(workflow_id);
CREATE INDEX idx_workflow_transitions_from ON workflow_transitions(from_state_id);
CREATE INDEX idx_workflow_logs_entity ON workflow_transition_logs(entity_type, entity_id);
CREATE INDEX idx_workflow_logs_time ON workflow_transition_logs(transitioned_at DESC);

-- ============================================================================
-- Seed default workflows (can be customized per organization)
-- ============================================================================

-- Note: Default workflows are inserted by application seed, not migration
-- This allows each organization to have their own copy to customize

COMMENT ON TABLE workflow_definitions IS 'Configurable workflow definitions per organization';
COMMENT ON TABLE workflow_states IS 'States within a workflow (e.g., Scheduled, CheckedIn)';
COMMENT ON TABLE workflow_transitions IS 'Valid transitions between states with guards and actions';
COMMENT ON TABLE workflow_transition_logs IS 'Audit trail for all state transitions (HIPAA compliance)';

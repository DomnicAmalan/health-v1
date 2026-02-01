-- Workflow Engine Tables
-- Stores workflow definitions, instances, tasks, and events for n8n-style orchestration

-- Workflow definitions (like n8n workflow templates)
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    category VARCHAR(100),

    -- Workflow graph stored as JSONB
    nodes JSONB NOT NULL DEFAULT '[]'::JSONB,
    edges JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Schemas for validation
    input_schema JSONB,
    output_schema JSONB,

    -- Event triggers (n8n-style webhooks)
    event_triggers JSONB DEFAULT '[]'::JSONB,

    -- Status and metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    organization_id UUID,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    -- Constraints
    CONSTRAINT workflow_name_version_unique UNIQUE (name, version)
);

CREATE INDEX idx_workflows_is_active ON workflows(is_active) WHERE is_active = true;
CREATE INDEX idx_workflows_category ON workflows(category);
CREATE INDEX idx_workflows_tags ON workflows USING GIN(tags);
CREATE INDEX idx_workflows_organization ON workflows(organization_id);
CREATE INDEX idx_workflows_event_triggers ON workflows USING GIN(event_triggers);

COMMENT ON TABLE workflows IS 'Workflow definitions with visual graph (nodes/edges)';
COMMENT ON COLUMN workflows.nodes IS 'Array of workflow nodes (Start, End, Action, Decision, HumanTask, etc.)';
COMMENT ON COLUMN workflows.edges IS 'Array of edges connecting nodes';
COMMENT ON COLUMN workflows.event_triggers IS 'Array of event types that trigger this workflow (e.g., ["patient_checked_in"])';

-- Workflow instances (running workflows)
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE RESTRICT,
    workflow_version INTEGER NOT NULL,

    -- Execution state
    status VARCHAR(50) NOT NULL DEFAULT 'running' CHECK (status IN (
        'running', 'waiting', 'paused', 'completed', 'failed', 'cancelled'
    )),
    current_nodes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- Can be multiple for parallel execution

    -- Workflow variables (state data)
    variables JSONB NOT NULL DEFAULT '{}'::JSONB,

    -- Execution history
    history JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Error tracking
    error TEXT,

    -- Correlation
    parent_instance_id UUID REFERENCES workflow_instances(id),
    correlation_id VARCHAR(255),

    -- Metadata
    triggered_by VARCHAR(255), -- Event type that triggered this instance
    triggered_by_user_id UUID,

    CONSTRAINT workflow_instance_check_completed CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed' AND completed_at IS NULL)
    )
);

CREATE INDEX idx_workflow_instances_workflow_id ON workflow_instances(workflow_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_correlation ON workflow_instances(correlation_id);
CREATE INDEX idx_workflow_instances_parent ON workflow_instances(parent_instance_id);
CREATE INDEX idx_workflow_instances_started_at ON workflow_instances(started_at DESC);

COMMENT ON TABLE workflow_instances IS 'Running workflow instances with execution state';
COMMENT ON COLUMN workflow_instances.current_nodes IS 'Array of node IDs currently being executed (multiple for parallel execution)';
COMMENT ON COLUMN workflow_instances.variables IS 'Workflow execution variables (state data passed between nodes)';
COMMENT ON COLUMN workflow_instances.history IS 'Array of execution steps with input/output/errors';

-- Human tasks (for HumanTask nodes)
CREATE TABLE workflow_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL, -- Node ID from workflow definition

    -- Task details
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Assignment
    assignee VARCHAR(255) NOT NULL, -- Role or user ID
    claimed_by UUID, -- User who claimed the task

    -- Form data
    form_schema JSONB,
    form_data JSONB, -- Pre-filled data

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'claimed', 'completed', 'expired', 'cancelled'
    )),

    -- Priority and deadline
    priority VARCHAR(50) CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    due_date TIMESTAMPTZ,

    -- Completion
    result JSONB,
    completed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT workflow_task_claimed_check CHECK (
        (status = 'claimed' AND claimed_by IS NOT NULL) OR
        (status != 'claimed')
    ),
    CONSTRAINT workflow_task_completed_check CHECK (
        (status = 'completed' AND completed_at IS NOT NULL AND result IS NOT NULL) OR
        (status != 'completed')
    )
);

CREATE INDEX idx_workflow_tasks_instance ON workflow_tasks(instance_id);
CREATE INDEX idx_workflow_tasks_status ON workflow_tasks(status) WHERE status IN ('pending', 'claimed');
CREATE INDEX idx_workflow_tasks_assignee ON workflow_tasks(assignee) WHERE status IN ('pending', 'claimed');
CREATE INDEX idx_workflow_tasks_claimed_by ON workflow_tasks(claimed_by) WHERE status = 'claimed';
CREATE INDEX idx_workflow_tasks_due_date ON workflow_tasks(due_date) WHERE status IN ('pending', 'claimed');
CREATE INDEX idx_workflow_tasks_priority ON workflow_tasks(priority);

COMMENT ON TABLE workflow_tasks IS 'Human tasks requiring user interaction';
COMMENT ON COLUMN workflow_tasks.assignee IS 'Role or user ID that should complete this task';
COMMENT ON COLUMN workflow_tasks.form_schema IS 'JSON Schema for task form (what data to collect)';

-- Workflow events (for event-driven orchestration)
CREATE TABLE workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(255) NOT NULL, -- e.g., "patient_checked_in", "prescription_created"
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,

    -- Processing status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'processed', 'failed'
    )),

    -- Triggered workflows
    triggered_workflows JSONB DEFAULT '[]'::JSONB, -- Array of workflow_instance_ids

    -- Source
    source_module VARCHAR(100), -- Module that emitted the event (opd, pharmacy, billing)
    source_user_id UUID,

    -- Error tracking
    error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_workflow_events_event_type ON workflow_events(event_type);
CREATE INDEX idx_workflow_events_status ON workflow_events(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_workflow_events_created_at ON workflow_events(created_at DESC);
CREATE INDEX idx_workflow_events_source_module ON workflow_events(source_module);

COMMENT ON TABLE workflow_events IS 'Event bus for triggering workflows (like n8n webhooks)';
COMMENT ON COLUMN workflow_events.event_type IS 'Type of event (e.g., patient_checked_in, prescription_created)';
COMMENT ON COLUMN workflow_events.triggered_workflows IS 'Array of workflow instance IDs that were started by this event';

-- Execution steps detail table (optional, for detailed history)
CREATE TABLE workflow_execution_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,

    -- Node details
    node_id VARCHAR(255) NOT NULL,
    node_name VARCHAR(255) NOT NULL,
    node_type VARCHAR(50) NOT NULL,

    -- Execution
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Data
    input JSONB,
    output JSONB,

    -- Decision/branching
    decision VARCHAR(255), -- For decision nodes
    edge_taken VARCHAR(255), -- Edge ID that was followed

    -- Error tracking
    error TEXT,

    CONSTRAINT workflow_step_instance_number_unique UNIQUE (instance_id, step_number)
);

CREATE INDEX idx_workflow_steps_instance ON workflow_execution_steps(instance_id, step_number);
CREATE INDEX idx_workflow_steps_started_at ON workflow_execution_steps(started_at);

COMMENT ON TABLE workflow_execution_steps IS 'Detailed execution history (alternative to storing in JSONB)';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_updated_at();

-- Sample workflow template: OPD Consultation
INSERT INTO workflows (
    id,
    name,
    description,
    version,
    category,
    nodes,
    edges,
    event_triggers,
    is_active,
    tags
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID,
    'OPD Consultation Workflow',
    'Automated workflow from patient check-in to consultation completion',
    1,
    'clinical',
    '[
        {
            "id": "start",
            "nodeType": "start",
            "name": "Patient Checks In",
            "position": [100, 200],
            "config": {},
            "metadata": {}
        },
        {
            "id": "create_visit",
            "nodeType": "action",
            "name": "Create Visit Record",
            "description": "Create EHR visit entry",
            "position": [300, 200],
            "config": {
                "action": "opd.createVisit",
                "parameters": {
                    "patientId": "${patientId}",
                    "visitType": "outpatient",
                    "chiefComplaint": "${chiefComplaint}"
                }
            },
            "metadata": {}
        },
        {
            "id": "create_invoice",
            "nodeType": "action",
            "name": "Create Draft Invoice",
            "description": "Create billing invoice with consultation fee",
            "position": [500, 200],
            "config": {
                "action": "billing.createInvoice",
                "parameters": {
                    "patientId": "${patientId}",
                    "visitId": "${visitId}",
                    "items": [{"code": "CONSULT", "description": "Consultation Fee", "amount": 100}]
                }
            },
            "metadata": {}
        },
        {
            "id": "doctor_task",
            "nodeType": "human_task",
            "name": "Doctor Consultation",
            "description": "Doctor examines patient and creates notes",
            "position": [700, 200],
            "config": {
                "assignee": "doctor",
                "formSchema": {
                    "type": "object",
                    "properties": {
                        "diagnosis": {"type": "string", "title": "Diagnosis"},
                        "prescriptions": {"type": "array", "items": {"type": "object"}},
                        "labOrders": {"type": "array", "items": {"type": "object"}}
                    }
                },
                "dueOffset": "+30m"
            },
            "metadata": {}
        },
        {
            "id": "end",
            "nodeType": "end",
            "name": "Consultation Complete",
            "position": [900, 200],
            "config": {},
            "metadata": {}
        }
    ]'::JSONB,
    '[
        {
            "id": "e1",
            "source": "start",
            "target": "create_visit",
            "priority": 0
        },
        {
            "id": "e2",
            "source": "create_visit",
            "target": "create_invoice",
            "priority": 0
        },
        {
            "id": "e3",
            "source": "create_invoice",
            "target": "doctor_task",
            "priority": 0
        },
        {
            "id": "e4",
            "source": "doctor_task",
            "target": "end",
            "priority": 0
        }
    ]'::JSONB,
    '["patient_checked_in"]'::JSONB,
    true,
    ARRAY['template', 'opd', 'clinical']
);

COMMENT ON TABLE workflows IS 'Workflow engine provides n8n-style visual orchestration for clinical processes';

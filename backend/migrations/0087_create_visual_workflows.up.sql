-- ============================================================================
-- Visual Workflow Designer System (n8n-style)
-- Enables visual workflow creation with nodes and edges
-- ============================================================================

-- Visual workflow definitions
CREATE TABLE visual_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Workflow metadata
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    version INT NOT NULL DEFAULT 1,

    -- Visual definition (n8n-style nodes and edges)
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',

    -- Schema for workflow variables
    input_schema JSONB,
    output_schema JSONB,

    -- Status and organization
    is_active BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[],

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    -- Constraints
    CONSTRAINT visual_workflows_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
    CONSTRAINT visual_workflows_category_length CHECK (category IS NULL OR char_length(category) <= 50)
);

-- Workflow instances (executions)
-- If the table already exists (from earlier migration), update the FK to reference visual_workflows.
-- Otherwise create it fresh.
CREATE TABLE IF NOT EXISTS workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    workflow_version INT NOT NULL,

    -- Execution state
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    current_nodes TEXT[] NOT NULL DEFAULT '{}',

    -- Runtime data
    variables JSONB NOT NULL DEFAULT '{}',
    history JSONB NOT NULL DEFAULT '[]',

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Error tracking
    error TEXT,

    -- Correlation for external tracking
    correlation_id VARCHAR(100),

    -- Parent instance for sub-workflows
    parent_instance_id UUID REFERENCES workflow_instances(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT workflow_instances_status_valid CHECK (
        status IN ('running', 'waiting', 'paused', 'completed', 'failed', 'cancelled')
    )
);

-- Update FK to reference visual_workflows instead of legacy workflows table
ALTER TABLE workflow_instances DROP CONSTRAINT IF EXISTS workflow_instances_workflow_id_fkey;
ALTER TABLE workflow_instances DROP CONSTRAINT IF EXISTS workflow_instance_check_completed;
ALTER TABLE workflow_instances ADD CONSTRAINT workflow_instances_visual_workflow_fkey
    FOREIGN KEY (workflow_id) REFERENCES visual_workflows(id) ON DELETE CASCADE;

-- Human tasks for user interaction
CREATE TABLE human_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,

    -- Task identity
    node_id VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Assignment
    assignee VARCHAR(100) NOT NULL,

    -- Form handling
    form_schema JSONB,
    form_data JSONB,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',

    -- Timing
    due_date TIMESTAMPTZ,
    claimed_by UUID,
    completed_at TIMESTAMPTZ,

    -- Result data
    result JSONB,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT human_tasks_status_valid CHECK (
        status IN ('pending', 'claimed', 'completed', 'expired', 'cancelled')
    ),
    CONSTRAINT human_tasks_priority_valid CHECK (
        priority IS NULL OR priority IN ('urgent', 'high', 'normal', 'low')
    ),
    CONSTRAINT human_tasks_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200)
);

-- Workflow execution audit log (HIPAA compliance)
CREATE TABLE workflow_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,

    -- What happened
    node_id VARCHAR(100) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_ms INT,

    -- Input/Output (sanitized - no PHI in logs)
    input_summary JSONB,
    output_summary JSONB,

    -- Error if failed
    error TEXT,

    -- Decision taken (for decision nodes)
    decision VARCHAR(100)
);

-- Performance indexes
CREATE INDEX idx_visual_workflows_org ON visual_workflows(organization_id);
CREATE INDEX idx_visual_workflows_active ON visual_workflows(organization_id, is_active);
CREATE INDEX idx_visual_workflows_category ON visual_workflows(organization_id, category);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow ON workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_correlation ON workflow_instances(correlation_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_started ON workflow_instances(started_at DESC);

CREATE INDEX idx_human_tasks_instance ON human_tasks(instance_id);
CREATE INDEX idx_human_tasks_assignee_status ON human_tasks(assignee, status);
CREATE INDEX idx_human_tasks_status ON human_tasks(status);
CREATE INDEX idx_human_tasks_due ON human_tasks(due_date) WHERE status = 'pending';

CREATE INDEX idx_workflow_execution_logs_instance ON workflow_execution_logs(instance_id);
CREATE INDEX idx_workflow_execution_logs_node ON workflow_execution_logs(instance_id, node_id);

-- Comments for documentation
COMMENT ON TABLE visual_workflows IS 'n8n-style visual workflow definitions with nodes and edges';
COMMENT ON TABLE workflow_instances IS 'Running or completed workflow executions';
COMMENT ON TABLE human_tasks IS 'Tasks requiring human interaction during workflow execution';
COMMENT ON TABLE workflow_execution_logs IS 'Audit trail for workflow execution steps (HIPAA compliance)';

COMMENT ON COLUMN visual_workflows.nodes IS 'Array of WorkflowNode objects with id, type, position, config';
COMMENT ON COLUMN visual_workflows.edges IS 'Array of WorkflowEdge objects with source, target, conditions';
COMMENT ON COLUMN workflow_instances.current_nodes IS 'Array of node IDs currently being executed';
COMMENT ON COLUMN workflow_instances.history IS 'Array of ExecutionStep objects tracking progress';

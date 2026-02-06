-- Phase 0.2: Worklists & Task Management
-- Universal task queue for all clinical and operational workflows

CREATE TABLE IF NOT EXISTS task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Task details
    task_type VARCHAR(100) NOT NULL,  -- lab_collection, result_entry, appointment_checkin, specimen_receive, etc.
    task_title VARCHAR(500) NOT NULL,
    task_description TEXT,
    task_category VARCHAR(100),  -- clinical, administrative, laboratory, radiology

    -- Assignment
    assigned_to_role VARCHAR(50),  -- Which role should see this task
    assigned_to_user_id UUID,  -- Optionally assign to specific user
    assigned_by UUID,
    assigned_by_name VARCHAR(200),
    assigned_datetime TIMESTAMPTZ,

    -- Priority & Status
    priority VARCHAR(50) NOT NULL DEFAULT 'normal',  -- stat, urgent, normal, low
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, cancelled

    -- Related entities (nullable - tasks may relate to different entities)
    patient_id UUID,
    patient_name VARCHAR(200),
    encounter_id UUID,
    order_id UUID,  -- Lab or imaging order
    appointment_id UUID,

    -- Timing constraints
    due_datetime TIMESTAMPTZ,
    started_datetime TIMESTAMPTZ,
    completed_datetime TIMESTAMPTZ,
    completed_by UUID,
    completed_by_name VARCHAR(200),

    -- Additional data
    task_data JSONB,  -- Flexible storage for task-specific data
    notes TEXT,
    completion_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_task_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT valid_task_priority CHECK (priority IN ('stat', 'urgent', 'normal', 'low')),
    CONSTRAINT completed_requires_user CHECK (
        (status = 'completed' AND completed_by IS NOT NULL AND completed_datetime IS NOT NULL)
        OR status != 'completed'
    )
);

-- Enforce bounded queue capacity with trigger
CREATE OR REPLACE FUNCTION check_task_queue_capacity()
RETURNS TRIGGER AS $$
DECLARE
    queue_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO queue_count
    FROM task_queue
    WHERE organization_id = NEW.organization_id
      AND status IN ('pending', 'in_progress')
      AND deleted_at IS NULL;

    IF queue_count >= 10000 THEN
        RAISE EXCEPTION 'Task queue at capacity (10000 pending/in-progress tasks)';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_queue_capacity
    BEFORE INSERT ON task_queue
    FOR EACH ROW
    EXECUTE FUNCTION check_task_queue_capacity();

-- Indexes for performance
CREATE INDEX idx_task_queue_org ON task_queue(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_queue_role_status ON task_queue(assigned_to_role, status, priority DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_queue_user_status ON task_queue(assigned_to_user_id, status, priority DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_queue_due ON task_queue(due_datetime) WHERE status IN ('pending', 'in_progress') AND deleted_at IS NULL;
CREATE INDEX idx_task_queue_patient ON task_queue(patient_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_queue_type ON task_queue(task_type, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_queue_status_created ON task_queue(status, created_at DESC) WHERE deleted_at IS NULL;

-- Task Templates
-- Pre-defined task templates for common workflows
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Template details
    template_name VARCHAR(200) NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    task_title_template VARCHAR(500) NOT NULL,  -- Can include {{placeholders}}
    task_description_template TEXT,
    task_category VARCHAR(100),

    -- Default assignment
    default_assigned_to_role VARCHAR(50),
    default_priority VARCHAR(50) DEFAULT 'normal',
    default_due_duration_minutes INTEGER,  -- Auto-calculate due_datetime

    -- Trigger conditions
    trigger_on_event VARCHAR(100),  -- appointment_scheduled, order_created, result_entered, etc.
    trigger_conditions JSONB,

    -- Active status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(organization_id, template_name)
);

CREATE INDEX idx_task_templates_org ON task_templates(organization_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_templates_trigger ON task_templates(trigger_on_event, is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE task_queue IS 'Universal task queue for clinical and operational workflows with bounded capacity';
COMMENT ON TABLE task_templates IS 'Reusable task templates with automatic task creation triggers';
COMMENT ON COLUMN task_queue.task_data IS 'Flexible JSONB storage for task-specific data (specimen barcodes, form data, etc.)';

-- OPD (Outpatient Department) Queue Management System
-- PostgreSQL tables for queue state management and consultation tracking

-- OPD Queue (Main queue tracking)
CREATE TABLE IF NOT EXISTS opd_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Patient information
    patient_id UUID NOT NULL REFERENCES ehr_patients(id),
    patient_ien INTEGER NOT NULL,
    patient_name VARCHAR(200),

    -- Appointment link
    appointment_id UUID,

    -- Queue details
    queue_number INTEGER NOT NULL,
    department VARCHAR(100) NOT NULL,
    visit_type VARCHAR(50) DEFAULT 'consultation',  -- consultation, follow_up, emergency

    -- Provider assignment
    provider_id UUID,
    provider_name VARCHAR(200),

    -- Timing
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    waiting_start_time TIMESTAMPTZ,
    consultation_start_time TIMESTAMPTZ,
    consultation_end_time TIMESTAMPTZ,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'waiting',  -- waiting, in_consultation, completed, cancelled, no_show
    priority VARCHAR(50) DEFAULT 'normal',  -- stat, urgent, normal

    -- Clinical context
    chief_complaint TEXT,
    vitals_recorded BOOLEAN DEFAULT FALSE,
    vitals_recorded_at TIMESTAMPTZ,

    -- Wait time tracking
    wait_time_minutes INTEGER,  -- Computed: consultation_start - check_in

    -- Cancellation
    cancelled_by UUID,
    cancelled_datetime TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Notes
    notes TEXT,

    -- Audit fields
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT valid_opd_queue_status CHECK (status IN ('waiting', 'in_consultation', 'completed', 'cancelled', 'no_show')),
    CONSTRAINT valid_opd_priority CHECK (priority IN ('stat', 'urgent', 'normal'))
);

-- OPD Consultations (Detailed consultation tracking)
CREATE TABLE IF NOT EXISTS opd_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Queue link
    queue_id UUID NOT NULL REFERENCES opd_queue(id) ON DELETE CASCADE,

    -- Patient & Provider
    patient_id UUID NOT NULL REFERENCES ehr_patients(id),
    provider_id UUID NOT NULL,
    provider_name VARCHAR(200),

    -- Consultation details
    consultation_type VARCHAR(50) NOT NULL DEFAULT 'general',  -- general, specialist, emergency
    department VARCHAR(100) NOT NULL,

    -- Timing
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,

    -- Clinical data
    chief_complaint TEXT,
    history_present_illness TEXT,
    examination_findings TEXT,
    provisional_diagnosis TEXT,
    treatment_plan TEXT,

    -- Orders placed
    lab_orders_count INTEGER DEFAULT 0,
    imaging_orders_count INTEGER DEFAULT 0,
    prescriptions_count INTEGER DEFAULT 0,

    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_instructions TEXT,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',  -- in_progress, completed, interrupted
    completion_status VARCHAR(50),  -- discharged, admitted, referred, follow_up

    -- Notes
    consultation_notes TEXT,

    -- Audit fields
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

-- OPD Queue Display Board Configuration
CREATE TABLE IF NOT EXISTS opd_display_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    department VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),

    -- Display settings
    show_queue_number BOOLEAN DEFAULT TRUE,
    show_patient_name BOOLEAN DEFAULT TRUE,
    show_provider BOOLEAN DEFAULT TRUE,
    show_wait_time BOOLEAN DEFAULT TRUE,

    -- Auto-refresh interval (seconds)
    refresh_interval_seconds INTEGER DEFAULT 30,

    -- Display capacity
    max_display_rows INTEGER DEFAULT 20,

    -- Status filters to show
    show_statuses JSONB DEFAULT '["waiting", "in_consultation"]'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(organization_id, department)
);

-- Indexes for performance
CREATE INDEX idx_opd_queue_organization ON opd_queue(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_opd_queue_patient ON opd_queue(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_opd_queue_status ON opd_queue(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_opd_queue_department_status ON opd_queue(department, status, check_in_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_opd_queue_provider ON opd_queue(provider_id) WHERE status = 'in_consultation' AND deleted_at IS NULL;
CREATE INDEX idx_opd_queue_check_in_time ON opd_queue(check_in_time) WHERE deleted_at IS NULL;

CREATE INDEX idx_opd_consultations_queue ON opd_consultations(queue_id);
CREATE INDEX idx_opd_consultations_patient ON opd_consultations(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_opd_consultations_provider ON opd_consultations(provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_opd_consultations_start_time ON opd_consultations(start_time);

-- Trigger: Auto-generate queue number per department per day
CREATE OR REPLACE FUNCTION generate_opd_queue_number()
RETURNS TRIGGER AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    max_queue_num INTEGER;
BEGIN
    -- Get max queue number for this department today
    SELECT COALESCE(MAX(queue_number), 0)
    INTO max_queue_num
    FROM opd_queue
    WHERE organization_id = NEW.organization_id
      AND department = NEW.department
      AND DATE(check_in_time) = today_date
      AND deleted_at IS NULL;

    -- Assign next queue number
    NEW.queue_number := max_queue_num + 1;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_opd_queue_number
    BEFORE INSERT ON opd_queue
    FOR EACH ROW
    WHEN (NEW.queue_number IS NULL)
    EXECUTE FUNCTION generate_opd_queue_number();

-- Trigger: Auto-calculate wait time when consultation starts
CREATE OR REPLACE FUNCTION calculate_opd_wait_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.consultation_start_time IS NOT NULL AND OLD.consultation_start_time IS NULL THEN
        NEW.wait_time_minutes := EXTRACT(EPOCH FROM (NEW.consultation_start_time - NEW.check_in_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_opd_wait_time
    BEFORE UPDATE ON opd_queue
    FOR EACH ROW
    EXECUTE FUNCTION calculate_opd_wait_time();

-- Trigger: Auto-calculate consultation duration
CREATE OR REPLACE FUNCTION calculate_consultation_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
        NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_consultation_duration
    BEFORE UPDATE ON opd_consultations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_consultation_duration();

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_opd_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_opd_queue_timestamp
    BEFORE UPDATE ON opd_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_opd_timestamp();

CREATE TRIGGER trigger_update_opd_consultations_timestamp
    BEFORE UPDATE ON opd_consultations
    FOR EACH ROW
    EXECUTE FUNCTION update_opd_timestamp();

COMMENT ON TABLE opd_queue IS 'OPD queue management for outpatient department patient flow tracking';
COMMENT ON TABLE opd_consultations IS 'Detailed consultation tracking with clinical notes and orders';
COMMENT ON TABLE opd_display_config IS 'Configuration for OPD display boards (TV screens in waiting areas)';

COMMENT ON COLUMN opd_queue.queue_number IS 'Auto-generated sequential number per department per day (resets daily)';
COMMENT ON COLUMN opd_queue.wait_time_minutes IS 'Auto-calculated wait time from check-in to consultation start';
COMMENT ON COLUMN opd_consultations.duration_minutes IS 'Auto-calculated consultation duration from start to end';

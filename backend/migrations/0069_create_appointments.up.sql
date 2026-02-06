-- Clinical Appointments & Scheduling System
-- PostgreSQL tables for appointment management with VistA ^SD integration

-- Appointments (Main scheduling table)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    ien INTEGER,  -- VistA ^SD (File #44) integration

    -- Patient & Provider
    patient_id UUID NOT NULL REFERENCES ehr_patients(id),
    patient_ien INTEGER NOT NULL,
    provider_id UUID,
    provider_name VARCHAR(200),

    -- Scheduling
    appointment_type VARCHAR(50) NOT NULL DEFAULT 'follow_up',  -- new_patient, follow_up, urgent, consultation
    scheduled_datetime TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    scheduled_end_datetime TIMESTAMPTZ NOT NULL,

    -- Location
    location_id UUID,
    location_name VARCHAR(200),
    room VARCHAR(50),
    department VARCHAR(100),

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',  -- scheduled, confirmed, checked_in, in_progress, completed, cancelled, no_show
    check_in_datetime TIMESTAMPTZ,
    check_out_datetime TIMESTAMPTZ,

    -- Details
    reason TEXT,
    chief_complaint TEXT,
    patient_instructions TEXT,
    notes TEXT,

    -- Cancellation
    cancelled_by UUID,
    cancelled_datetime TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Reminders
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_datetime TIMESTAMPTZ,
    reminder_method VARCHAR(50),  -- sms, email, phone, push

    -- Recurrence (for repeating appointments)
    recurrence_rule VARCHAR(500),  -- iCalendar RRULE format
    recurrence_parent_id UUID REFERENCES appointments(id),

    -- Confirmation
    confirmed_by UUID,
    confirmed_datetime TIMESTAMPTZ,
    confirmation_method VARCHAR(50),  -- phone, email, sms, app

    -- Encounter link (created after check-in)
    encounter_id UUID,

    -- Wait time tracking
    wait_time_minutes INTEGER,  -- Time from check-in to in_progress

    -- VistA sync
    mumps_data JSONB,  -- Cache of ^SD data for offline capability
    mumps_last_sync TIMESTAMPTZ,

    -- Audit fields
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT appointments_end_after_start CHECK (scheduled_end_datetime > scheduled_datetime),
    CONSTRAINT valid_appointment_status CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show')),
    CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480)
);

-- Appointment Availability Slots (Provider schedule templates)
CREATE TABLE IF NOT EXISTS appointment_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Provider & Location
    provider_id UUID NOT NULL,
    provider_name VARCHAR(200),
    location_id UUID,
    location_name VARCHAR(200),
    department VARCHAR(100),

    -- Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    day_of_week INTEGER NOT NULL,

    -- Time slot
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Slot configuration
    slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
    max_appointments_per_slot INTEGER DEFAULT 1,

    -- Effective dates
    effective_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_end_date DATE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6),
    CONSTRAINT availability_end_after_start CHECK (end_time > start_time)
);

-- Appointment Blocks (Time off, holidays, out of office)
CREATE TABLE IF NOT EXISTS appointment_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Provider (NULL means organization-wide block)
    provider_id UUID,
    provider_name VARCHAR(200),

    -- Block details
    block_type VARCHAR(50) NOT NULL,  -- vacation, holiday, meeting, conference, emergency
    block_title VARCHAR(200) NOT NULL,
    block_description TEXT,

    -- Time range
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule VARCHAR(500),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT block_end_after_start CHECK (end_datetime > start_datetime)
);

-- Appointment Cancellation Reasons (Master data)
CREATE TABLE IF NOT EXISTS appointment_cancellation_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    reason_code VARCHAR(50) NOT NULL,
    reason_description VARCHAR(200) NOT NULL,
    requires_reschedule BOOLEAN DEFAULT FALSE,
    is_patient_initiated BOOLEAN DEFAULT TRUE,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(organization_id, reason_code)
);

-- Indexes for performance
CREATE INDEX idx_appointments_organization ON appointments(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_patient ON appointments(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_provider ON appointments(provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_scheduled_datetime ON appointments(scheduled_datetime) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_status ON appointments(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_department ON appointments(department) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_provider_date ON appointments(provider_id, scheduled_datetime) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_date_range ON appointments(scheduled_datetime, scheduled_end_datetime) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_ien ON appointments(ien) WHERE ien IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_availability_provider ON appointment_availability(provider_id, day_of_week) WHERE deleted_at IS NULL;
CREATE INDEX idx_availability_active ON appointment_availability(is_active, provider_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_blocks_provider ON appointment_blocks(provider_id, start_datetime, end_datetime) WHERE deleted_at IS NULL;
CREATE INDEX idx_blocks_date_range ON appointment_blocks(start_datetime, end_datetime) WHERE deleted_at IS NULL;

-- Trigger: Auto-calculate scheduled_end_datetime from duration
CREATE OR REPLACE FUNCTION calculate_appointment_end_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.scheduled_end_datetime IS NULL OR OLD.duration_minutes != NEW.duration_minutes THEN
        NEW.scheduled_end_datetime := NEW.scheduled_datetime + (NEW.duration_minutes || ' minutes')::INTERVAL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_appointment_end_time
    BEFORE INSERT OR UPDATE OF scheduled_datetime, duration_minutes ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_appointment_end_time();

-- Trigger: Auto-calculate wait time when appointment starts
CREATE OR REPLACE FUNCTION calculate_appointment_wait_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' AND NEW.check_in_datetime IS NOT NULL THEN
        NEW.wait_time_minutes := EXTRACT(EPOCH FROM (NOW() - NEW.check_in_datetime)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_appointment_wait_time
    BEFORE UPDATE OF status ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_appointment_wait_time();

-- Trigger: Update updated_at timestamp and version
CREATE OR REPLACE FUNCTION update_appointment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    NEW.version := OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_appointment_timestamp
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointment_timestamp();

-- Seed common cancellation reasons
INSERT INTO appointment_cancellation_reasons (organization_id, reason_code, reason_description, requires_reschedule, is_patient_initiated)
SELECT
    o.id,
    reason_code,
    reason_description,
    requires_reschedule,
    is_patient_initiated
FROM organizations o
CROSS JOIN (VALUES
    ('PATIENT_CANCEL', 'Patient requested cancellation', true, true),
    ('PATIENT_NO_SHOW', 'Patient did not show up', true, true),
    ('PATIENT_LATE_CANCEL', 'Patient cancelled less than 24 hours before', true, true),
    ('PROVIDER_CANCEL', 'Provider unavailable', true, false),
    ('EMERGENCY', 'Provider emergency', true, false),
    ('WEATHER', 'Weather/natural disaster', true, false),
    ('FACILITY_CLOSED', 'Facility closed', true, false),
    ('DUPLICATE', 'Duplicate appointment', false, false),
    ('ERROR', 'Scheduling error', false, false),
    ('RESCHEDULED', 'Rescheduled by patient', false, true)
) AS reasons(reason_code, reason_description, requires_reschedule, is_patient_initiated)
ON CONFLICT (organization_id, reason_code) DO NOTHING;

COMMENT ON TABLE appointments IS 'Clinical appointments with VistA ^SD integration';
COMMENT ON TABLE appointment_availability IS 'Provider schedule templates (recurring weekly slots)';
COMMENT ON TABLE appointment_blocks IS 'Time blocks for vacation, holidays, meetings (blocks scheduling)';
COMMENT ON TABLE appointment_cancellation_reasons IS 'Master data for standardized cancellation reasons';

COMMENT ON COLUMN appointments.ien IS 'VistA ^SD (File #44) Internal Entry Number';
COMMENT ON COLUMN appointments.recurrence_rule IS 'iCalendar RRULE format for repeating appointments (e.g., FREQ=WEEKLY;COUNT=10)';
COMMENT ON COLUMN appointments.wait_time_minutes IS 'Auto-calculated time from check-in to in_progress status';
COMMENT ON COLUMN appointment_availability.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';

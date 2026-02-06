-- Problem List/Diagnoses Management System
-- PostgreSQL tables for tracking patient problems/diagnoses with ICD-10/SNOMED codes
-- VistA ^AUPNPROB (File #9000011) integration

-- Problem List (Active/Historical Diagnoses)
CREATE TABLE IF NOT EXISTS problem_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    ien INTEGER,  -- VistA ^AUPNPROB (File #9000011) integration

    -- Patient context
    patient_id UUID NOT NULL REFERENCES ehr_patients(id),
    patient_ien INTEGER NOT NULL,

    -- Problem identification
    problem_name VARCHAR(500) NOT NULL,
    problem_code VARCHAR(50),  -- Could be ICD-10, SNOMED, or custom code
    problem_code_system VARCHAR(50),  -- 'ICD10', 'SNOMED', 'CUSTOM'

    -- ICD-10 coding (for billing/reporting)
    icd10_code VARCHAR(20),
    icd10_description TEXT,

    -- SNOMED CT coding (for clinical interoperability)
    snomed_code VARCHAR(50),
    snomed_description TEXT,

    -- Clinical context
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- active, resolved, inactive, entered_in_error
    onset_date DATE,
    onset_date_precision VARCHAR(20) DEFAULT 'day',  -- day, month, year, approximate
    resolved_date DATE,
    resolved_reason TEXT,

    -- Source of problem
    encounter_id UUID REFERENCES encounters(id),  -- Where problem was identified
    recorded_by UUID NOT NULL,
    recorded_by_name VARCHAR(200),
    recorded_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Provider information
    provider_id UUID,
    provider_name VARCHAR(200),

    -- Severity & Priority
    severity VARCHAR(50),  -- mild, moderate, severe, life_threatening
    acuity VARCHAR(50),  -- acute, chronic, acute_on_chronic
    is_chronic BOOLEAN DEFAULT FALSE,
    is_principal_diagnosis BOOLEAN DEFAULT FALSE,  -- Primary problem

    -- Clinical notes
    problem_comment TEXT,
    clinical_notes TEXT,

    -- Status tracking
    last_reviewed_date DATE,
    review_frequency_days INTEGER,  -- How often to review (e.g., 90 days for chronic conditions)

    -- VistA sync
    mumps_data JSONB,
    mumps_last_sync TIMESTAMPTZ,

    -- Audit fields
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT valid_problem_status CHECK (status IN ('active', 'resolved', 'inactive', 'entered_in_error')),
    CONSTRAINT valid_severity CHECK (severity IS NULL OR severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
    CONSTRAINT valid_acuity CHECK (acuity IS NULL OR acuity IN ('acute', 'chronic', 'acute_on_chronic')),
    CONSTRAINT resolved_has_date CHECK (status != 'resolved' OR resolved_date IS NOT NULL)
);

-- Problem History (Track status changes)
CREATE TABLE IF NOT EXISTS problem_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problem_list(id) ON DELETE CASCADE,

    -- Change details
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    change_reason TEXT,

    -- Who made the change
    changed_by UUID NOT NULL,
    changed_by_name VARCHAR(200),
    changed_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Context
    encounter_id UUID REFERENCES encounters(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Problem Comments (Additional notes over time)
CREATE TABLE IF NOT EXISTS problem_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problem_list(id) ON DELETE CASCADE,

    comment_text TEXT NOT NULL,

    -- Author
    author_id UUID NOT NULL,
    author_name VARCHAR(200),
    comment_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Context
    encounter_id UUID REFERENCES encounters(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_problem_list_organization ON problem_list(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_problem_list_patient ON problem_list(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_problem_list_patient_ien ON problem_list(patient_ien) WHERE deleted_at IS NULL;
CREATE INDEX idx_problem_list_status ON problem_list(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_problem_list_icd10 ON problem_list(icd10_code) WHERE icd10_code IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_problem_list_snomed ON problem_list(snomed_code) WHERE snomed_code IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_problem_list_chronic ON problem_list(is_chronic) WHERE is_chronic = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_problem_list_encounter ON problem_list(encounter_id) WHERE encounter_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_problem_list_ien ON problem_list(ien) WHERE ien IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_problem_history_problem ON problem_history(problem_id);
CREATE INDEX idx_problem_history_datetime ON problem_history(changed_datetime DESC);

CREATE INDEX idx_problem_comments_problem ON problem_comments(problem_id);

-- Trigger: Auto-update timestamp and version
CREATE OR REPLACE FUNCTION update_problem_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    NEW.version := OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_problem_timestamp
    BEFORE UPDATE ON problem_list
    FOR EACH ROW
    EXECUTE FUNCTION update_problem_timestamp();

-- Trigger: Record status changes in history
CREATE OR REPLACE FUNCTION record_problem_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO problem_history (
            problem_id,
            previous_status,
            new_status,
            changed_by,
            changed_datetime,
            encounter_id
        )
        VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.updated_by,
            NOW(),
            NEW.encounter_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_problem_status_change
    AFTER UPDATE OF status ON problem_list
    FOR EACH ROW
    EXECUTE FUNCTION record_problem_status_change();

-- Trigger: Auto-set resolved_date when status changes to resolved
CREATE OR REPLACE FUNCTION set_resolved_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' AND NEW.resolved_date IS NULL THEN
        NEW.resolved_date := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_resolved_date
    BEFORE UPDATE OF status ON problem_list
    FOR EACH ROW
    EXECUTE FUNCTION set_resolved_date();

COMMENT ON TABLE problem_list IS 'Patient problem list/diagnoses with ICD-10/SNOMED codes and VistA ^AUPNPROB integration';
COMMENT ON TABLE problem_history IS 'Audit trail of problem status changes';
COMMENT ON TABLE problem_comments IS 'Additional notes and comments on problems over time';

COMMENT ON COLUMN problem_list.ien IS 'VistA ^AUPNPROB (File #9000011) Internal Entry Number';
COMMENT ON COLUMN problem_list.status IS 'Problem status: active (ongoing), resolved (cured), inactive (not currently being treated), entered_in_error';
COMMENT ON COLUMN problem_list.is_chronic IS 'True for chronic conditions requiring long-term management';
COMMENT ON COLUMN problem_list.is_principal_diagnosis IS 'True for the primary problem/diagnosis';
COMMENT ON COLUMN problem_list.review_frequency_days IS 'How often to review this problem (e.g., 90 days for chronic conditions)';

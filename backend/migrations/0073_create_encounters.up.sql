-- Migration: Create encounters table for clinical documentation
-- Creates core encounters table with auto-generated encounter numbers

CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_number VARCHAR(50) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES ehr_patients(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    location_id UUID, -- References locations(id) if locations table exists

    -- Encounter context
    encounter_type VARCHAR(50) NOT NULL CHECK (encounter_type IN ('outpatient', 'inpatient', 'emergency', 'telemedicine')),
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    encounter_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    checkout_datetime TIMESTAMP WITH TIME ZONE,

    -- Clinical documentation
    visit_reason TEXT,
    chief_complaint TEXT,
    assessment TEXT CHECK (length(assessment) <= 10000),
    plan TEXT CHECK (length(plan) <= 10000),

    -- Coding
    icd10_codes TEXT[] DEFAULT '{}',
    cpt_codes TEXT[] DEFAULT '{}',

    -- VistA integration
    vista_ien VARCHAR(50),

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for common query patterns
CREATE INDEX idx_encounters_patient_id ON encounters(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_encounters_provider_id ON encounters(provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_encounters_status ON encounters(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_encounters_encounter_datetime ON encounters(encounter_datetime) WHERE deleted_at IS NULL;
CREATE INDEX idx_encounters_organization_id ON encounters(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_encounters_encounter_number ON encounters(encounter_number);
CREATE INDEX idx_encounters_vista_ien ON encounters(vista_ien) WHERE vista_ien IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_encounters_updated_at
    BEFORE UPDATE ON encounters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate encounter numbers: ENC-YYYYMMDD-000001
CREATE OR REPLACE FUNCTION generate_encounter_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    date_prefix VARCHAR(8);
    sequence_num INTEGER;
    encounter_number VARCHAR(50);
BEGIN
    -- Generate date prefix (YYYYMMDD)
    date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

    -- Get next sequence number for today
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(encounter_number FROM 13) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM encounters
    WHERE encounter_number LIKE 'ENC-' || date_prefix || '-%'
    AND deleted_at IS NULL;

    -- Format: ENC-YYYYMMDD-000001
    encounter_number := 'ENC-' || date_prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');

    RETURN encounter_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE encounters IS 'Clinical encounters (visits) with context-aware documentation';
COMMENT ON COLUMN encounters.encounter_number IS 'Auto-generated unique identifier: ENC-YYYYMMDD-000001';
COMMENT ON COLUMN encounters.encounter_type IS 'Type of visit: outpatient, inpatient, emergency, telemedicine';
COMMENT ON COLUMN encounters.status IS 'Encounter workflow status: scheduled → in_progress → completed/cancelled';
COMMENT ON COLUMN encounters.assessment IS 'Clinical assessment (max 10,000 chars)';
COMMENT ON COLUMN encounters.plan IS 'Treatment plan (max 10,000 chars)';
COMMENT ON COLUMN encounters.icd10_codes IS 'Array of ICD-10 diagnosis codes';
COMMENT ON COLUMN encounters.cpt_codes IS 'Array of CPT procedure codes';

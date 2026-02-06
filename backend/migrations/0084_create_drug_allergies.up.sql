-- Drug Allergies table
-- Stores patient drug allergy information for CDS alerts

CREATE TABLE IF NOT EXISTS drug_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    patient_id UUID NOT NULL REFERENCES ehr_patients(id),
    drug_id UUID REFERENCES drug_catalogs(id),
    drug_name VARCHAR(255) NOT NULL,
    allergy_type VARCHAR(50) DEFAULT 'allergy', -- allergy, intolerance, sensitivity
    severity VARCHAR(50) DEFAULT 'moderate', -- mild, moderate, severe, life-threatening
    reaction TEXT,
    onset_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, resolved
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_drug_allergies_patient ON drug_allergies(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drug_allergies_org ON drug_allergies(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drug_allergies_drug ON drug_allergies(drug_id) WHERE deleted_at IS NULL;

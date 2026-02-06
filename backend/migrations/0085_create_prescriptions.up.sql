-- Prescriptions table
-- Stores patient medication prescriptions

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    patient_id UUID NOT NULL REFERENCES ehr_patients(id),
    encounter_id UUID,
    drug_id UUID REFERENCES drug_catalogs(id),
    drug_name VARCHAR(255) NOT NULL,
    drug_code VARCHAR(50),
    dosage VARCHAR(100),
    dosage_unit VARCHAR(50),
    frequency VARCHAR(100),
    route VARCHAR(50), -- oral, IV, IM, etc.
    duration_days INTEGER,
    quantity INTEGER,
    refills_allowed INTEGER DEFAULT 0,
    refills_remaining INTEGER DEFAULT 0,
    prescriber_id UUID,
    prescriber_name VARCHAR(255),
    prescribed_date DATE DEFAULT CURRENT_DATE,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, discontinued, cancelled
    discontinued_reason TEXT,
    pharmacy_notes TEXT,
    patient_instructions TEXT,
    is_prn BOOLEAN DEFAULT FALSE,
    prn_reason TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prescriptions_org ON prescriptions(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prescriptions_drug ON prescriptions(drug_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prescriptions_status ON prescriptions(status) WHERE deleted_at IS NULL;

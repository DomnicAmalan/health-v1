-- Phase 1: EHR Patients Table
-- PostgreSQL cache for VistA ^DPT (File #2) patient data with dual-read support

CREATE TABLE IF NOT EXISTS ehr_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    ien INTEGER,  -- VistA Internal Entry Number (^DPT IEN)

    -- Medical Record Number (unique identifier)
    mrn VARCHAR(50) NOT NULL,

    -- Demographics
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    suffix VARCHAR(20),
    maiden_name VARCHAR(100),

    -- Personal Information
    date_of_birth DATE,
    age INTEGER,  -- Computed field for convenience
    sex VARCHAR(20),  -- M, F, O, U (Male, Female, Other, Unknown)
    gender_identity VARCHAR(50),
    sexual_orientation VARCHAR(50),

    -- Marital & Family
    marital_status VARCHAR(50),

    -- Race & Ethnicity (HIPAA/HL7 standard codes)
    race VARCHAR(100),
    ethnicity VARCHAR(100),

    -- Language & Culture
    preferred_language VARCHAR(50),
    religion VARCHAR(100),

    -- Veteran Status (VistA legacy)
    veteran_status BOOLEAN DEFAULT FALSE,
    service_connected BOOLEAN DEFAULT FALSE,

    -- Contact Information
    email VARCHAR(200),
    phone_home VARCHAR(20),
    phone_work VARCHAR(20),
    phone_mobile VARCHAR(20),
    phone_preferred VARCHAR(20),  -- Which number to call first

    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    county VARCHAR(100),
    country VARCHAR(100) DEFAULT 'USA',

    -- Emergency Contact
    emergency_contact_name VARCHAR(200),
    emergency_contact_relationship VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_address TEXT,

    -- Next of Kin
    next_of_kin_name VARCHAR(200),
    next_of_kin_relationship VARCHAR(100),
    next_of_kin_phone VARCHAR(20),

    -- Insurance Primary
    insurance_primary_carrier VARCHAR(200),
    insurance_primary_policy_number VARCHAR(100),
    insurance_primary_group_number VARCHAR(100),

    -- Care Team
    primary_care_provider_id UUID,  -- Reference to users table
    primary_care_provider_name VARCHAR(200),
    primary_facility_id UUID,
    primary_facility_name VARCHAR(200),

    -- Patient Status
    status VARCHAR(50) DEFAULT 'active',  -- active, inactive, deceased, merged
    deceased_date DATE,
    deceased_reason TEXT,

    -- Confidentiality & Restrictions
    confidentiality_code VARCHAR(50),  -- normal, restricted, very_restricted
    restricted_access BOOLEAN DEFAULT FALSE,
    vip_flag BOOLEAN DEFAULT FALSE,

    -- Consent & Preferences
    advance_directive BOOLEAN DEFAULT FALSE,
    advance_directive_date DATE,
    organ_donor BOOLEAN DEFAULT FALSE,
    research_consent BOOLEAN DEFAULT FALSE,

    -- Communication Preferences
    preferred_contact_method VARCHAR(50),  -- phone, email, mail, portal
    appointment_reminder_sms BOOLEAN DEFAULT TRUE,
    appointment_reminder_email BOOLEAN DEFAULT TRUE,

    -- Photo/Biometric
    photo_url TEXT,

    -- MUMPS Global Cache (raw VistA data)
    mumps_data JSONB,  -- Cache of ^DPT(ien,...) data for offline capability
    mumps_last_sync TIMESTAMPTZ,  -- Last sync from YottaDB

    -- Audit & Version Control
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,

    -- Constraints
    UNIQUE(organization_id, mrn),
    UNIQUE(organization_id, ien),
    CONSTRAINT valid_sex CHECK (sex IN ('M', 'F', 'O', 'U')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'deceased', 'merged')),
    CONSTRAINT deceased_requires_date CHECK (
        (status = 'deceased' AND deceased_date IS NOT NULL) OR
        status != 'deceased'
    )
);

-- Patient Identifiers (additional ID types)
CREATE TABLE IF NOT EXISTS patient_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES ehr_patients(id) ON DELETE CASCADE,

    identifier_type VARCHAR(100) NOT NULL,  -- SSN, Driver_License, Passport, Insurance_ID, etc.
    identifier_value VARCHAR(200) NOT NULL,
    identifier_system VARCHAR(200),  -- Issuing authority

    is_primary BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(patient_id, identifier_type, identifier_value)
);

-- Patient Merge History (track merged patient records)
CREATE TABLE IF NOT EXISTS patient_merge_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    source_patient_id UUID NOT NULL,  -- The patient that was merged (now inactive)
    source_mrn VARCHAR(50) NOT NULL,
    target_patient_id UUID NOT NULL REFERENCES ehr_patients(id),  -- The surviving patient
    target_mrn VARCHAR(50) NOT NULL,

    merged_by UUID NOT NULL,
    merged_by_name VARCHAR(200),
    merged_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    merge_reason TEXT,

    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ehr_patients_organization ON ehr_patients(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ehr_patients_mrn ON ehr_patients(organization_id, mrn) WHERE deleted_at IS NULL;
CREATE INDEX idx_ehr_patients_ien ON ehr_patients(ien) WHERE ien IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_ehr_patients_name ON ehr_patients(last_name, first_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_ehr_patients_dob ON ehr_patients(date_of_birth) WHERE deleted_at IS NULL;
CREATE INDEX idx_ehr_patients_status ON ehr_patients(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_ehr_patients_phone_mobile ON ehr_patients(phone_mobile) WHERE phone_mobile IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_ehr_patients_email ON ehr_patients(email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_ehr_patients_provider ON ehr_patients(primary_care_provider_id) WHERE deleted_at IS NULL;

-- Full-text search index for patient search
CREATE INDEX idx_ehr_patients_search ON ehr_patients USING gin(to_tsvector('english',
    COALESCE(first_name, '') || ' ' ||
    COALESCE(last_name, '') || ' ' ||
    COALESCE(mrn, '') || ' ' ||
    COALESCE(phone_mobile, '') || ' ' ||
    COALESCE(email, '')
)) WHERE deleted_at IS NULL;

-- Trigger: Auto-generate MRN if not provided
CREATE OR REPLACE FUNCTION generate_mrn()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mrn IS NULL OR NEW.mrn = '' THEN
        NEW.mrn := 'MRN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('patient_mrn_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS patient_mrn_seq START 1;

CREATE TRIGGER trigger_generate_mrn
    BEFORE INSERT ON ehr_patients
    FOR EACH ROW
    WHEN (NEW.mrn IS NULL OR NEW.mrn = '')
    EXECUTE FUNCTION generate_mrn();

-- Trigger: Update age when date_of_birth changes
CREATE OR REPLACE FUNCTION update_patient_age()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_of_birth IS NOT NULL THEN
        NEW.age := DATE_PART('year', AGE(NOW(), NEW.date_of_birth::TIMESTAMP))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_patient_age
    BEFORE INSERT OR UPDATE OF date_of_birth ON ehr_patients
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_age();

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_patient_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    NEW.version := OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_patient_timestamp
    BEFORE UPDATE ON ehr_patients
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_timestamp();

COMMENT ON TABLE ehr_patients IS 'Patient demographics and contact information (PostgreSQL cache for VistA ^DPT global)';
COMMENT ON COLUMN ehr_patients.ien IS 'VistA Internal Entry Number for ^DPT global synchronization';
COMMENT ON COLUMN ehr_patients.mumps_data IS 'Cached JSON representation of VistA ^DPT data for offline access';
COMMENT ON COLUMN ehr_patients.mrn IS 'Medical Record Number - primary patient identifier';
COMMENT ON COLUMN ehr_patients.status IS 'Patient status: active (current patient), inactive (no longer seen), deceased, merged (duplicate record)';
COMMENT ON COLUMN ehr_patients.confidentiality_code IS 'Patient privacy level: normal, restricted (requires special access), very_restricted (VIP/sensitive)';

COMMENT ON TABLE patient_identifiers IS 'Additional patient identifiers (SSN, Driver License, Insurance IDs, etc)';
COMMENT ON TABLE patient_merge_history IS 'Audit trail of patient record merges for duplicate resolution';

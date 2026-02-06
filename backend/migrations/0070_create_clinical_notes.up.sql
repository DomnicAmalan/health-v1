-- Clinical Notes & Documentation System
-- PostgreSQL tables for clinical documentation with SOAP format and VistA ^TIU integration

-- Clinical Notes (Main documentation table)
CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    ien INTEGER,  -- VistA ^TIU (File #8925) integration

    -- Context
    encounter_id UUID,
    patient_id UUID NOT NULL REFERENCES ehr_patients(id),
    patient_ien INTEGER NOT NULL,
    provider_id UUID NOT NULL,
    provider_name VARCHAR(200),

    -- Note type
    note_type VARCHAR(100) NOT NULL,  -- progress_note, consultation, procedure_note, discharge_summary, history_physical
    note_title VARCHAR(200),
    template_id UUID,

    -- SOAP Format (Primary documentation structure)
    subjective TEXT,  -- Patient's description of symptoms
    objective TEXT,   -- Clinical findings, vitals, exam results
    assessment TEXT,  -- Diagnosis, problem list analysis
    plan TEXT,        -- Treatment plan, orders, follow-up

    -- Additional Comprehensive Sections
    chief_complaint TEXT,
    history_present_illness TEXT,
    past_medical_history TEXT,
    past_surgical_history TEXT,
    medications TEXT,
    allergies TEXT,
    social_history TEXT,
    family_history TEXT,
    review_of_systems TEXT,
    physical_examination TEXT,

    -- Structured data (for coding/billing)
    diagnoses JSONB,  -- Array of {icd10_code, description, is_primary}
    procedures JSONB, -- Array of {cpt_code, description, quantity}

    -- Discharge-specific fields
    discharge_disposition VARCHAR(100),  -- home, home_with_services, rehab, skilled_nursing, etc.
    discharge_medications TEXT,
    discharge_instructions TEXT,
    discharge_follow_up TEXT,

    -- Procedure-specific fields
    procedure_performed TEXT,
    procedure_indication TEXT,
    procedure_findings TEXT,
    procedure_complications TEXT,

    -- Status & Workflow
    status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft, pending_review, signed, amended, deleted, error
    signed_by UUID,
    signed_datetime TIMESTAMPTZ,
    signed_electronically BOOLEAN DEFAULT FALSE,

    -- Amendments & Corrections
    is_amended BOOLEAN DEFAULT FALSE,
    amended_by UUID,
    amended_datetime TIMESTAMPTZ,
    amendment_reason TEXT,
    original_note_id UUID REFERENCES clinical_notes(id),

    -- Cosign (for trainees/supervised providers)
    requires_cosign BOOLEAN DEFAULT FALSE,
    cosigned_by UUID,
    cosigned_datetime TIMESTAMPTZ,

    -- Addendum
    addendum_to_note_id UUID REFERENCES clinical_notes(id),
    is_addendum BOOLEAN DEFAULT FALSE,

    -- Confidentiality
    confidentiality_level VARCHAR(50) DEFAULT 'normal',  -- normal, restricted, very_restricted
    restricted_access BOOLEAN DEFAULT FALSE,

    -- VistA sync
    mumps_data JSONB,  -- Cache of ^TIU data
    mumps_last_sync TIMESTAMPTZ,

    -- Audit fields
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT valid_note_status CHECK (status IN ('draft', 'pending_review', 'signed', 'amended', 'deleted', 'error')),
    CONSTRAINT valid_confidentiality CHECK (confidentiality_level IN ('normal', 'restricted', 'very_restricted')),
    CONSTRAINT signed_requires_datetime CHECK (
        (status = 'signed' AND signed_by IS NOT NULL AND signed_datetime IS NOT NULL) OR
        status != 'signed'
    )
);

-- Note Templates (Pre-defined templates for common note types)
CREATE TABLE IF NOT EXISTS note_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    template_name VARCHAR(200) NOT NULL,
    note_type VARCHAR(100) NOT NULL,
    description TEXT,

    -- Template content
    template_sections JSONB NOT NULL,  -- {subjective: "", objective: "", assessment: "", plan: ""}
    required_fields JSONB,  -- Array of required field names

    -- Specialty/department specific
    department VARCHAR(100),
    specialty VARCHAR(100),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(organization_id, template_name)
);

-- Note Macros (Text snippets/shortcuts for quick documentation)
CREATE TABLE IF NOT EXISTS note_macros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    macro_name VARCHAR(100) NOT NULL,
    macro_shortcut VARCHAR(50),  -- e.g., ".hpi" expands to full HPI template
    macro_text TEXT NOT NULL,
    macro_category VARCHAR(100),  -- physical_exam, assessment, plan, medication, etc.

    -- Provider-specific or shared
    provider_id UUID,  -- NULL means shared across organization
    is_shared BOOLEAN DEFAULT FALSE,

    -- Usage tracking
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,

    UNIQUE(organization_id, provider_id, macro_shortcut)
);

-- Note Attachments (Images, PDFs, external documents)
CREATE TABLE IF NOT EXISTS note_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES clinical_notes(id) ON DELETE CASCADE,

    attachment_type VARCHAR(50) NOT NULL,  -- image, pdf, document, lab_result, imaging_report
    file_name VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    file_url TEXT,  -- S3/storage URL

    -- Metadata
    description TEXT,
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_clinical_notes_organization ON clinical_notes(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clinical_notes_patient ON clinical_notes(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clinical_notes_provider ON clinical_notes(provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clinical_notes_encounter ON clinical_notes(encounter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clinical_notes_status ON clinical_notes(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_clinical_notes_note_type ON clinical_notes(note_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_clinical_notes_created_at ON clinical_notes(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_clinical_notes_ien ON clinical_notes(ien) WHERE ien IS NOT NULL AND deleted_at IS NULL;

-- GIN index for diagnoses/procedures JSONB searching
CREATE INDEX idx_clinical_notes_diagnoses ON clinical_notes USING gin(diagnoses) WHERE deleted_at IS NULL;
CREATE INDEX idx_clinical_notes_procedures ON clinical_notes USING gin(procedures) WHERE deleted_at IS NULL;

CREATE INDEX idx_note_templates_org_type ON note_templates(organization_id, note_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_note_templates_active ON note_templates(is_active) WHERE deleted_at IS NULL;

CREATE INDEX idx_note_macros_provider ON note_macros(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX idx_note_macros_shortcut ON note_macros(organization_id, macro_shortcut);

CREATE INDEX idx_note_attachments_note ON note_attachments(note_id);

-- Trigger: Update updated_at timestamp and version
CREATE OR REPLACE FUNCTION update_clinical_note_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    NEW.version := OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clinical_note_timestamp
    BEFORE UPDATE ON clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_clinical_note_timestamp();

-- Trigger: Increment macro use count
CREATE OR REPLACE FUNCTION increment_macro_use_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE note_macros
    SET use_count = use_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.template_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Seed common note templates
INSERT INTO note_templates (organization_id, template_name, note_type, description, template_sections, is_active, is_default)
SELECT
    o.id,
    template_name,
    note_type,
    description,
    template_sections::jsonb,
    true,
    is_default
FROM organizations o
CROSS JOIN (VALUES
    ('Progress Note - General', 'progress_note', 'Standard progress note for routine follow-up',
     '{"subjective": "Patient reports...", "objective": "Vitals: \nPhysical Exam: ", "assessment": "1. ", "plan": "1. Continue current medications\n2. Follow-up in "}', true),

    ('Consultation Note', 'consultation', 'Initial consultation note',
     '{"subjective": "Reason for consultation: \nHistory: ", "objective": "Review of Systems: \nPhysical Examination: ", "assessment": "Impression: ", "plan": "Recommendations: "}', true),

    ('Discharge Summary', 'discharge_summary', 'Hospital discharge documentation',
     '{"subjective": "Admission Date: \nDischarge Date: \nAdmitting Diagnosis: ", "objective": "Hospital Course: \nDischarge Vitals: ", "assessment": "Discharge Diagnosis: ", "plan": "Discharge Medications: \nFollow-up: \nDischarge Instructions: "}', true),

    ('History & Physical', 'history_physical', 'Initial H&P documentation',
     '{"subjective": "CC: \nHPI: \nPMH: \nPSH: \nMedications: \nAllergies: \nSocial History: \nFamily History: ", "objective": "Vitals: \nROS: \nPhysical Exam: ", "assessment": "Impression: ", "plan": "Plan: "}', true),

    ('Procedure Note', 'procedure_note', 'Documentation for procedures performed',
     '{"subjective": "Indication: \nConsent: Obtained", "objective": "Procedure: \nFindings: ", "assessment": "Complications: None", "plan": "Post-procedure plan: "}', true)
) AS templates(template_name, note_type, description, template_sections, is_default)
ON CONFLICT (organization_id, template_name) DO NOTHING;

COMMENT ON TABLE clinical_notes IS 'Clinical documentation with SOAP format and VistA ^TIU integration';
COMMENT ON TABLE note_templates IS 'Pre-defined templates for common note types';
COMMENT ON TABLE note_macros IS 'Text snippets/shortcuts for quick documentation (e.g., .hpi expands to template)';
COMMENT ON TABLE note_attachments IS 'Images, PDFs, and documents attached to clinical notes';

COMMENT ON COLUMN clinical_notes.ien IS 'VistA ^TIU (File #8925) Internal Entry Number';
COMMENT ON COLUMN clinical_notes.diagnoses IS 'JSONB array of {icd10_code, description, is_primary} for structured diagnosis coding';
COMMENT ON COLUMN clinical_notes.procedures IS 'JSONB array of {cpt_code, description, quantity} for billing and documentation';
COMMENT ON COLUMN clinical_notes.is_amended IS 'True if this note has been amended (creates new note with reference to original)';
COMMENT ON COLUMN clinical_notes.is_addendum IS 'True if this note is an addendum to another note';
COMMENT ON COLUMN note_macros.macro_shortcut IS 'Keyboard shortcut that expands to full text (e.g., .hpi)';

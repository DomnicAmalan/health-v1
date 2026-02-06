-- Migration: Create anatomy system taxonomy and findings tables
-- Supports 3D anatomy-based clinical documentation

-- Body Systems: Standard anatomical classification
CREATE TABLE IF NOT EXISTS body_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_code VARCHAR(100) NOT NULL UNIQUE,
    system_name VARCHAR(200) NOT NULL,
    parent_system_id UUID REFERENCES body_systems(id) ON DELETE CASCADE,

    -- Medical coding
    icd10_chapter VARCHAR(50),
    snomed_code VARCHAR(50),
    fma_code VARCHAR(50), -- Foundational Model of Anatomy

    -- 3D Model integration
    model_region_id VARCHAR(100) NOT NULL UNIQUE, -- Maps to GLTF mesh names
    display_color VARCHAR(7) NOT NULL, -- Hex color for highlighting (#E74C3C)

    -- Clinical templates
    common_findings TEXT[] DEFAULT '{}', -- Quick templates for documentation

    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_body_systems_system_code ON body_systems(system_code);
CREATE INDEX idx_body_systems_parent_system_id ON body_systems(parent_system_id);
CREATE INDEX idx_body_systems_model_region_id ON body_systems(model_region_id);
CREATE INDEX idx_body_systems_is_active ON body_systems(is_active);

-- Trigger to update updated_at
CREATE TRIGGER update_body_systems_updated_at
    BEFORE UPDATE ON body_systems
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Body System Lab Tests: Context-aware lab recommendations
CREATE TABLE IF NOT EXISTS body_system_lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    body_system_id UUID NOT NULL REFERENCES body_systems(id) ON DELETE CASCADE,
    lab_test_id UUID REFERENCES lab_tests(id) ON DELETE CASCADE,
    lab_panel_id UUID REFERENCES lab_panels(id) ON DELETE CASCADE,

    -- Recommendation metadata
    relevance_score DECIMAL(3, 2) NOT NULL CHECK (relevance_score >= 0.0 AND relevance_score <= 1.0),
    recommendation_reason TEXT NOT NULL,

    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Ensure either lab_test_id or lab_panel_id is set (not both)
    CONSTRAINT check_test_or_panel CHECK (
        (lab_test_id IS NOT NULL AND lab_panel_id IS NULL) OR
        (lab_test_id IS NULL AND lab_panel_id IS NOT NULL)
    )
);

CREATE INDEX idx_body_system_lab_tests_body_system_id ON body_system_lab_tests(body_system_id);
CREATE INDEX idx_body_system_lab_tests_lab_test_id ON body_system_lab_tests(lab_test_id);
CREATE INDEX idx_body_system_lab_tests_lab_panel_id ON body_system_lab_tests(lab_panel_id);
CREATE INDEX idx_body_system_lab_tests_relevance_score ON body_system_lab_tests(relevance_score DESC);

-- Anatomy Findings: Clinical observations documented on 3D anatomy model
CREATE TABLE IF NOT EXISTS anatomy_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES ehr_patients(id) ON DELETE RESTRICT,
    body_system_id UUID NOT NULL REFERENCES body_systems(id) ON DELETE RESTRICT,

    -- Finding details
    finding_type VARCHAR(50) NOT NULL CHECK (finding_type IN ('inspection', 'palpation', 'auscultation', 'percussion')),
    finding_category VARCHAR(50) NOT NULL CHECK (finding_category IN ('normal', 'abnormal', 'critical')),
    finding_text TEXT NOT NULL CHECK (length(finding_text) > 0 AND length(finding_text) <= 10000),

    -- Clinical attributes
    severity VARCHAR(50) CHECK (severity IN ('mild', 'moderate', 'severe')),
    laterality VARCHAR(50) CHECK (laterality IN ('left', 'right', 'bilateral', 'midline')),

    -- 3D annotation placement (stores x, y, z coordinates)
    model_coordinates JSONB,

    -- Audit fields
    documented_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    documented_datetime TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_anatomy_findings_encounter_id ON anatomy_findings(encounter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_anatomy_findings_patient_id ON anatomy_findings(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_anatomy_findings_body_system_id ON anatomy_findings(body_system_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_anatomy_findings_finding_category ON anatomy_findings(finding_category) WHERE deleted_at IS NULL;
CREATE INDEX idx_anatomy_findings_documented_datetime ON anatomy_findings(documented_datetime) WHERE deleted_at IS NULL;

-- Trigger to update updated_at
CREATE TRIGGER update_anatomy_findings_updated_at
    BEFORE UPDATE ON anatomy_findings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE body_systems IS 'Anatomical body systems taxonomy with 3D model mappings';
COMMENT ON COLUMN body_systems.system_code IS 'Unique system identifier: CARDIOVASCULAR, RESPIRATORY, DIGESTIVE_LIVER';
COMMENT ON COLUMN body_systems.model_region_id IS 'Maps to 3D GLTF mesh names (e.g., CHEST_heart, ABDOMEN_liver)';
COMMENT ON COLUMN body_systems.display_color IS 'Hex color for 3D highlighting (#E74C3C for heart)';
COMMENT ON COLUMN body_systems.common_findings IS 'Template phrases for quick documentation';

COMMENT ON TABLE body_system_lab_tests IS 'Context-aware lab test recommendations per body system';
COMMENT ON COLUMN body_system_lab_tests.relevance_score IS 'Recommendation strength: 1.0 = strongly recommended, 0.0 = minimal relevance';

COMMENT ON TABLE anatomy_findings IS 'Clinical findings documented on 3D anatomy model';
COMMENT ON COLUMN anatomy_findings.finding_type IS 'Physical exam method: inspection, palpation, auscultation, percussion';
COMMENT ON COLUMN anatomy_findings.finding_category IS 'Severity: normal, abnormal, critical';
COMMENT ON COLUMN anatomy_findings.finding_text IS 'Free-text clinical observation (max 10,000 chars)';
COMMENT ON COLUMN anatomy_findings.model_coordinates IS 'JSON: {x, y, z} for 3D annotation badge placement';

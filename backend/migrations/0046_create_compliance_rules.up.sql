-- Migration: Create compliance rules and assessments
-- Description: Compliance applicability rules and assessment tracking
-- Related Entities:
--   - src/domain/entities/compliance_rule.rs
--   - src/domain/entities/compliance_assessment.rs
--
-- Tables Created:
--   - compliance_rules
--   - compliance_assessments
--   - compliance_gaps

CREATE TYPE entity_type AS ENUM (
    'hospital',
    'clinic',
    'patient',
    'provider',
    'organization',
    'facility',
    'system'
);

-- Compliance rules define which regulations apply to which regions/entities
CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_id UUID NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES geographic_regions(id) ON DELETE CASCADE,
    entity_type entity_type NOT NULL,
    conditions JSONB DEFAULT '{}'::jsonb, -- additional conditions (e.g., size, type)
    priority INTEGER NOT NULL DEFAULT 0, -- for conflict resolution (higher = more priority)
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ, -- NULL means currently active
    override_parent BOOLEAN NOT NULL DEFAULT false, -- can override parent region rules
    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL
);

-- Compliance assessments track organization/facility compliance status
CREATE TABLE IF NOT EXISTS compliance_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    facility_id UUID, -- optional, for facility-specific assessments
    regulation_id UUID NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
    assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL, -- 'compliant', 'non_compliant', 'partial', 'pending'
    score INTEGER, -- 0-100 compliance score
    notes TEXT,
    assessed_by UUID REFERENCES users(id),
    next_assessment_due TIMESTAMPTZ,
    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL
);

-- Compliance gaps track specific non-compliance issues
CREATE TABLE IF NOT EXISTS compliance_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES compliance_assessments(id) ON DELETE CASCADE,
    regulation_id UUID NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
    section_id UUID REFERENCES regulation_sections(id),
    gap_description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL, -- 'critical', 'high', 'medium', 'low'
    remediation_plan TEXT,
    target_resolution_date TIMESTAMPTZ,
    actual_resolution_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_compliance_rules_regulation_id ON compliance_rules(regulation_id);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_region_id ON compliance_rules(region_id);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_entity_type ON compliance_rules(entity_type);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_effective ON compliance_rules(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_priority ON compliance_rules(priority DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_assessments_org_id ON compliance_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_regulation_id ON compliance_assessments(regulation_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_status ON compliance_assessments(status);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_date ON compliance_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_due ON compliance_assessments(next_assessment_due);

CREATE INDEX IF NOT EXISTS idx_compliance_gaps_assessment_id ON compliance_gaps(assessment_id);
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_regulation_id ON compliance_gaps(regulation_id);
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_status ON compliance_gaps(status);
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_severity ON compliance_gaps(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_resolution_date ON compliance_gaps(target_resolution_date);

-- Indexes for audit fields
CREATE INDEX IF NOT EXISTS idx_compliance_rules_request_id ON compliance_rules(request_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_request_id ON compliance_assessments(request_id);
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_request_id ON compliance_gaps(request_id);

-- Add triggers
CREATE TRIGGER update_compliance_rules_updated_at BEFORE UPDATE ON compliance_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_assessments_updated_at BEFORE UPDATE ON compliance_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_gaps_updated_at BEFORE UPDATE ON compliance_gaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


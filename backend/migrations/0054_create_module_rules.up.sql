-- Migration: Create module rules framework
-- Description: Links regulations to specific modules and fields for location-aware validation
-- Related Entities:
--   - src/domain/entities/module_rule.rs (to be created)
--   - src/domain/entities/field_validation.rs (to be created)
--
-- Tables Created:
--   - module_rules
--   - field_validations
--   - hospital_config

-- Module rule category (what type of rule this is)
CREATE TYPE module_rule_category AS ENUM (
    'validation',      -- Field validation rule
    'workflow',        -- Workflow requirement
    'documentation',   -- Documentation requirement
    'authorization',   -- Authorization rule
    'notification',    -- Alert/notification trigger
    'audit',           -- Audit requirement
    'retention',       -- Data retention rule
    'phi_protection'   -- PHI/sensitive data rule
);

-- Field validation type
CREATE TYPE field_validation_type AS ENUM (
    'required',        -- Field is required
    'format',          -- Specific format required (regex)
    'range',           -- Numeric/date range
    'enum',            -- Must be from list of values
    'reference',       -- Must reference valid record
    'computed',        -- Auto-computed value
    'conditional',     -- Required based on condition
    'unique',          -- Must be unique
    'immutable'        -- Cannot be changed after creation
);

-- Module rules: Links regulations to specific application modules
CREATE TABLE IF NOT EXISTS module_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Rule identification
    rule_code VARCHAR(100) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Module targeting
    module_name VARCHAR(100) NOT NULL,       -- e.g., 'pharmacy', 'billing', 'patient', 'ehr'
    entity_name VARCHAR(100),                 -- e.g., 'medication', 'prescription', 'patient'

    -- Regulation linkage
    regulation_id UUID REFERENCES regulations(id) ON DELETE SET NULL,
    section_id UUID REFERENCES regulation_sections(id) ON DELETE SET NULL,

    -- Geographic scope
    region_id UUID REFERENCES geographic_regions(id) ON DELETE CASCADE,

    -- Rule definition
    category module_rule_category NOT NULL,
    rule_definition JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Rule-specific configuration
    error_message TEXT,                       -- User-facing error message
    error_code VARCHAR(50),                   -- Machine-readable error code

    -- Applicability
    entity_type entity_type,                  -- Which entity types this applies to
    priority INTEGER NOT NULL DEFAULT 0,      -- Higher = evaluated first
    is_mandatory BOOLEAN NOT NULL DEFAULT true,

    -- Effective dates
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Multi-tenant support (NULL for system-wide rules)
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT uq_module_rule_code UNIQUE (rule_code, organization_id, region_id)
);

-- Field validations: Dynamic field-level validation rules
CREATE TABLE IF NOT EXISTS field_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Field targeting
    module_name VARCHAR(100) NOT NULL,        -- Module containing the field
    entity_name VARCHAR(100) NOT NULL,        -- Entity containing the field
    field_name VARCHAR(100) NOT NULL,         -- Field to validate
    field_path VARCHAR(255),                  -- JSON path for nested fields

    -- Validation definition
    validation_type field_validation_type NOT NULL,
    validation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example configs:
    -- required: {"when": {"field": "status", "eq": "active"}}
    -- format: {"pattern": "^[A-Z]{2}\\d{6}$", "message": "Invalid MRN format"}
    -- range: {"min": 0, "max": 150, "unit": "years"}
    -- enum: {"values": ["active", "inactive", "deceased"]}

    -- Error handling
    error_message TEXT NOT NULL,
    error_code VARCHAR(50),
    severity VARCHAR(20) NOT NULL DEFAULT 'error', -- 'error', 'warning', 'info'

    -- Regulation linkage (optional)
    regulation_id UUID REFERENCES regulations(id) ON DELETE SET NULL,
    module_rule_id UUID REFERENCES module_rules(id) ON DELETE SET NULL,

    -- Geographic scope
    region_id UUID REFERENCES geographic_regions(id) ON DELETE CASCADE,

    -- Applicability
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Effective dates
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,

    -- Multi-tenant support
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

-- Hospital configuration: Links hospital to location and configuration
CREATE TABLE IF NOT EXISTS hospital_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization linkage
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Hospital identification
    hospital_code VARCHAR(50) NOT NULL,
    hospital_name VARCHAR(255) NOT NULL,
    hospital_type VARCHAR(50) NOT NULL,       -- 'government', 'private', 'teaching', 'specialty'

    -- Location binding
    region_id UUID NOT NULL REFERENCES geographic_regions(id),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country_code VARCHAR(3) NOT NULL,         -- ISO 3166-1 alpha-3
    coordinates GEOGRAPHY(POINT, 4326),       -- PostGIS point for exact location

    -- Regulatory information
    license_number VARCHAR(100),
    license_expiry DATE,
    accreditation_body VARCHAR(100),          -- e.g., 'NABH', 'JCI'
    accreditation_status VARCHAR(50),
    accreditation_expiry DATE,

    -- Configuration
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    locale VARCHAR(10) NOT NULL DEFAULT 'en',
    currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
    fiscal_year_start INTEGER DEFAULT 4,      -- Month (1-12), default April for India

    -- Feature flags
    features JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT uq_hospital_org UNIQUE (organization_id),
    CONSTRAINT uq_hospital_code UNIQUE (hospital_code)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Module rules indexes
CREATE INDEX IF NOT EXISTS idx_module_rules_module ON module_rules(module_name);
CREATE INDEX IF NOT EXISTS idx_module_rules_entity ON module_rules(entity_name);
CREATE INDEX IF NOT EXISTS idx_module_rules_regulation ON module_rules(regulation_id);
CREATE INDEX IF NOT EXISTS idx_module_rules_region ON module_rules(region_id);
CREATE INDEX IF NOT EXISTS idx_module_rules_category ON module_rules(category);
CREATE INDEX IF NOT EXISTS idx_module_rules_org ON module_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_module_rules_active ON module_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_module_rules_effective ON module_rules(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_module_rules_priority ON module_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_module_rules_request_id ON module_rules(request_id);
CREATE INDEX IF NOT EXISTS idx_module_rules_deleted ON module_rules(deleted_at) WHERE deleted_at IS NULL;

-- Field validations indexes
CREATE INDEX IF NOT EXISTS idx_field_validations_module ON field_validations(module_name);
CREATE INDEX IF NOT EXISTS idx_field_validations_entity ON field_validations(entity_name);
CREATE INDEX IF NOT EXISTS idx_field_validations_field ON field_validations(field_name);
CREATE INDEX IF NOT EXISTS idx_field_validations_type ON field_validations(validation_type);
CREATE INDEX IF NOT EXISTS idx_field_validations_region ON field_validations(region_id);
CREATE INDEX IF NOT EXISTS idx_field_validations_org ON field_validations(organization_id);
CREATE INDEX IF NOT EXISTS idx_field_validations_active ON field_validations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_field_validations_request_id ON field_validations(request_id);
CREATE INDEX IF NOT EXISTS idx_field_validations_deleted ON field_validations(deleted_at) WHERE deleted_at IS NULL;

-- Composite index for field lookup
CREATE INDEX IF NOT EXISTS idx_field_validations_lookup
    ON field_validations(module_name, entity_name, field_name, region_id)
    WHERE is_active = true AND deleted_at IS NULL;

-- Hospital config indexes
CREATE INDEX IF NOT EXISTS idx_hospital_config_org ON hospital_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_hospital_config_region ON hospital_config(region_id);
CREATE INDEX IF NOT EXISTS idx_hospital_config_country ON hospital_config(country_code);
CREATE INDEX IF NOT EXISTS idx_hospital_config_type ON hospital_config(hospital_type);
CREATE INDEX IF NOT EXISTS idx_hospital_config_active ON hospital_config(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_hospital_config_request_id ON hospital_config(request_id);
CREATE INDEX IF NOT EXISTS idx_hospital_config_deleted ON hospital_config(deleted_at) WHERE deleted_at IS NULL;

-- Spatial index for location queries
CREATE INDEX IF NOT EXISTS idx_hospital_config_location ON hospital_config USING GIST(coordinates);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_module_rules_updated_at BEFORE UPDATE ON module_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_field_validations_updated_at BEFORE UPDATE ON field_validations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hospital_config_updated_at BEFORE UPDATE ON hospital_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE module_rules IS 'Links regulations to specific application modules for location-aware rule enforcement';
COMMENT ON COLUMN module_rules.rule_code IS 'Unique identifier for the rule (e.g., IND-CDSCO-SCHEDULE-H)';
COMMENT ON COLUMN module_rules.module_name IS 'Application module name (pharmacy, billing, patient, ehr)';
COMMENT ON COLUMN module_rules.rule_definition IS 'JSON configuration for the rule logic';

COMMENT ON TABLE field_validations IS 'Dynamic field-level validation rules per region/organization';
COMMENT ON COLUMN field_validations.validation_config IS 'JSON configuration for validation (patterns, ranges, enums)';
COMMENT ON COLUMN field_validations.severity IS 'error=block action, warning=allow with warning, info=informational';

COMMENT ON TABLE hospital_config IS 'Hospital-specific configuration binding organization to geographic region';
COMMENT ON COLUMN hospital_config.features IS 'Feature flags for this hospital (e.g., {"pharmacy": true, "telemedicine": false})';
COMMENT ON COLUMN hospital_config.settings IS 'Hospital-specific settings (e.g., {"defaultDepartment": "OPD"})';

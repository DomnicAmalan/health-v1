-- Migration: Create drug catalog and regulation system
-- Description: Country-specific drug catalogs with regulatory classification
-- Related Entities:
--   - src/domain/entities/drug.rs (to be created)
--   - src/domain/entities/drug_interaction.rs (to be created)
--
-- Tables Created:
--   - drug_catalogs (country/region specific catalogs)
--   - drug_master (drug definitions)
--   - drug_formulations (dosage forms)
--   - drug_schedules (regulatory schedules)
--   - drug_interactions
--   - drug_contraindications
--   - drug_allergies_mapping
--
-- VistA Integration:
--   - Maps to ^PSDRUG (Drug File)
--   - Maps to ^PSNDF (National Drug File)

-- Drug schedule type (regulatory classification)
CREATE TYPE drug_schedule_type AS ENUM (
    -- India (Drugs and Cosmetics Act)
    'schedule_h',        -- Prescription only
    'schedule_h1',       -- Stricter prescription (antibiotics, etc.)
    'schedule_x',        -- Narcotics/controlled substances
    'schedule_g',        -- Restricted to hospitals
    'otc',               -- Over the counter
    -- US FDA
    'schedule_i',        -- No accepted medical use, high abuse
    'schedule_ii',       -- High abuse potential, severe dependence
    'schedule_iii',      -- Moderate abuse potential
    'schedule_iv',       -- Low abuse potential
    'schedule_v',        -- Lowest abuse potential
    'rx_only',           -- Prescription only (non-controlled)
    -- General
    'unscheduled',       -- No schedule restrictions
    'investigational'    -- Clinical trial only
);

-- Drug form type
CREATE TYPE drug_form_type AS ENUM (
    'tablet',
    'capsule',
    'syrup',
    'suspension',
    'injection',
    'iv_fluid',
    'cream',
    'ointment',
    'gel',
    'drops',
    'inhaler',
    'patch',
    'suppository',
    'powder',
    'solution',
    'spray',
    'lozenge',
    'granules',
    'other'
);

-- Drug route of administration
CREATE TYPE drug_route AS ENUM (
    'oral',
    'sublingual',
    'buccal',
    'intravenous',
    'intramuscular',
    'subcutaneous',
    'intradermal',
    'topical',
    'transdermal',
    'inhalation',
    'nasal',
    'ophthalmic',
    'otic',
    'rectal',
    'vaginal',
    'intrathecal',
    'epidural',
    'other'
);

-- Interaction severity
CREATE TYPE interaction_severity AS ENUM (
    'contraindicated',   -- Do not use together
    'major',             -- Serious - may require intervention
    'moderate',          -- Significant - monitor closely
    'minor',             -- Limited clinical significance
    'unknown'            -- Insufficient data
);

-- =============================================================================
-- DRUG CATALOGS (Country/Region specific)
-- =============================================================================

CREATE TABLE IF NOT EXISTS drug_catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Catalog identification
    catalog_code VARCHAR(50) NOT NULL,        -- e.g., 'IND-IP', 'US-NDC', 'WHO-ATC'
    catalog_name VARCHAR(255) NOT NULL,       -- e.g., 'Indian Pharmacopoeia'
    catalog_version VARCHAR(50),              -- Version/edition

    -- Geographic scope
    region_id UUID NOT NULL REFERENCES geographic_regions(id),
    country_code VARCHAR(3) NOT NULL,         -- ISO 3166-1 alpha-3

    -- Regulatory body
    regulatory_body VARCHAR(255),             -- e.g., 'CDSCO', 'FDA', 'EMA'
    regulatory_url VARCHAR(500),

    -- Catalog metadata
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_primary BOOLEAN NOT NULL DEFAULT false, -- Primary catalog for region

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

    CONSTRAINT uq_drug_catalog_code UNIQUE (catalog_code, country_code)
);

-- =============================================================================
-- DRUG SCHEDULES (Regulatory classification per region)
-- =============================================================================

CREATE TABLE IF NOT EXISTS drug_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Schedule identification
    schedule_code VARCHAR(50) NOT NULL,       -- e.g., 'H', 'H1', 'X', 'II'
    schedule_name VARCHAR(255) NOT NULL,      -- e.g., 'Schedule H - Prescription Only'
    schedule_type drug_schedule_type NOT NULL,

    -- Geographic scope
    catalog_id UUID NOT NULL REFERENCES drug_catalogs(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES geographic_regions(id),

    -- Schedule rules
    description TEXT,
    prescriber_requirements TEXT,             -- Who can prescribe
    dispensing_requirements TEXT,             -- Dispensing rules
    record_keeping_days INTEGER,              -- How long to keep records
    refill_allowed BOOLEAN NOT NULL DEFAULT true,
    max_refills INTEGER,
    max_quantity_days INTEGER,                -- Max days supply per fill

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

    CONSTRAINT uq_drug_schedule UNIQUE (schedule_code, catalog_id)
);

-- =============================================================================
-- DRUG MASTER (Drug definitions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS drug_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Drug identification
    drug_code VARCHAR(100) NOT NULL,          -- Unique code within catalog
    generic_name VARCHAR(255) NOT NULL,       -- INN (International Nonproprietary Name)
    brand_names TEXT[],                       -- Array of brand names

    -- Classification
    catalog_id UUID NOT NULL REFERENCES drug_catalogs(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES drug_schedules(id),
    therapeutic_class VARCHAR(255),           -- e.g., 'Antibiotic', 'Analgesic'
    pharmacological_class VARCHAR(255),       -- e.g., 'Beta-lactam', 'NSAID'

    -- Coding systems
    atc_code VARCHAR(10),                     -- WHO ATC classification
    rxnorm_code VARCHAR(20),                  -- RxNorm CUI
    ndc_code VARCHAR(20),                     -- US NDC
    snomed_code VARCHAR(20),                  -- SNOMED CT

    -- Drug properties
    form drug_form_type NOT NULL,
    route drug_route NOT NULL,
    strength VARCHAR(100),                    -- e.g., '500mg', '250mg/5ml'
    strength_unit VARCHAR(50),                -- e.g., 'mg', 'ml', 'mcg'
    strength_value DECIMAL(10, 4),            -- Numeric strength for calculations

    -- Dosing information
    usual_dose VARCHAR(255),                  -- e.g., '500mg twice daily'
    max_daily_dose VARCHAR(100),
    pediatric_dose VARCHAR(255),
    geriatric_dose VARCHAR(255),

    -- Special populations
    pregnancy_category VARCHAR(10),           -- A, B, C, D, X
    lactation_safe BOOLEAN,
    renal_adjustment_required BOOLEAN DEFAULT false,
    hepatic_adjustment_required BOOLEAN DEFAULT false,

    -- Storage & handling
    storage_conditions VARCHAR(255),
    shelf_life_months INTEGER,
    requires_refrigeration BOOLEAN DEFAULT false,
    light_sensitive BOOLEAN DEFAULT false,

    -- Pricing (reference price)
    unit_price DECIMAL(12, 4),
    currency_code VARCHAR(3) DEFAULT 'INR',
    price_effective_date DATE,

    -- VistA integration
    vista_ien BIGINT,                         -- VistA Internal Entry Number
    vista_file_number DECIMAL(10, 2) DEFAULT 50, -- File #50 (Drug)

    -- Status
    is_formulary BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Multi-tenant (NULL for system-wide)
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

    CONSTRAINT uq_drug_master_code UNIQUE (drug_code, catalog_id)
);

-- =============================================================================
-- DRUG INTERACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS drug_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Interacting drugs
    drug_id_1 UUID NOT NULL REFERENCES drug_master(id) ON DELETE CASCADE,
    drug_id_2 UUID NOT NULL REFERENCES drug_master(id) ON DELETE CASCADE,

    -- Or by generic name for cross-catalog matching
    generic_name_1 VARCHAR(255),
    generic_name_2 VARCHAR(255),

    -- Interaction details
    severity interaction_severity NOT NULL,
    interaction_type VARCHAR(100),            -- e.g., 'pharmacokinetic', 'pharmacodynamic'
    mechanism TEXT,                           -- How the interaction occurs
    clinical_effect TEXT NOT NULL,            -- What happens clinically
    management TEXT,                          -- How to handle the interaction

    -- Evidence
    evidence_level VARCHAR(50),               -- e.g., 'established', 'probable', 'suspected'
    reference_source VARCHAR(255),            -- Source of interaction data

    -- Catalog scope
    catalog_id UUID REFERENCES drug_catalogs(id) ON DELETE CASCADE,

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

    CONSTRAINT uq_drug_interaction UNIQUE (drug_id_1, drug_id_2),
    CONSTRAINT chk_different_drugs CHECK (drug_id_1 != drug_id_2)
);

-- =============================================================================
-- DRUG CONTRAINDICATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS drug_contraindications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Drug reference
    drug_id UUID NOT NULL REFERENCES drug_master(id) ON DELETE CASCADE,

    -- Contraindication details
    contraindication_type VARCHAR(50) NOT NULL, -- 'absolute', 'relative', 'precaution'
    condition_code VARCHAR(50),               -- ICD-10 or SNOMED code
    condition_name VARCHAR(255) NOT NULL,     -- e.g., 'Renal failure', 'Pregnancy'
    description TEXT,
    severity interaction_severity NOT NULL DEFAULT 'major',

    -- Management
    alternative_recommendation TEXT,

    -- Catalog scope
    catalog_id UUID REFERENCES drug_catalogs(id) ON DELETE CASCADE,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL
);

-- =============================================================================
-- DRUG-ALLERGY MAPPING (for allergy cross-checking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS drug_allergy_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Drug reference
    drug_id UUID NOT NULL REFERENCES drug_master(id) ON DELETE CASCADE,

    -- Allergy component
    allergen_class VARCHAR(255) NOT NULL,     -- e.g., 'Penicillin', 'Sulfonamide'
    allergen_name VARCHAR(255),               -- Specific allergen
    cross_reactivity_class VARCHAR(255),      -- Cross-reactivity group

    -- Severity
    typical_severity VARCHAR(50) NOT NULL DEFAULT 'moderate',

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Drug catalogs
CREATE INDEX IF NOT EXISTS idx_drug_catalogs_region ON drug_catalogs(region_id);
CREATE INDEX IF NOT EXISTS idx_drug_catalogs_country ON drug_catalogs(country_code);
CREATE INDEX IF NOT EXISTS idx_drug_catalogs_active ON drug_catalogs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drug_catalogs_primary ON drug_catalogs(is_primary) WHERE is_primary = true;

-- Drug schedules
CREATE INDEX IF NOT EXISTS idx_drug_schedules_catalog ON drug_schedules(catalog_id);
CREATE INDEX IF NOT EXISTS idx_drug_schedules_region ON drug_schedules(region_id);
CREATE INDEX IF NOT EXISTS idx_drug_schedules_type ON drug_schedules(schedule_type);

-- Drug master
CREATE INDEX IF NOT EXISTS idx_drug_master_catalog ON drug_master(catalog_id);
CREATE INDEX IF NOT EXISTS idx_drug_master_schedule ON drug_master(schedule_id);
CREATE INDEX IF NOT EXISTS idx_drug_master_generic ON drug_master(generic_name);
CREATE INDEX IF NOT EXISTS idx_drug_master_atc ON drug_master(atc_code);
CREATE INDEX IF NOT EXISTS idx_drug_master_rxnorm ON drug_master(rxnorm_code);
CREATE INDEX IF NOT EXISTS idx_drug_master_therapeutic ON drug_master(therapeutic_class);
CREATE INDEX IF NOT EXISTS idx_drug_master_form ON drug_master(form);
CREATE INDEX IF NOT EXISTS idx_drug_master_route ON drug_master(route);
CREATE INDEX IF NOT EXISTS idx_drug_master_formulary ON drug_master(is_formulary) WHERE is_formulary = true;
CREATE INDEX IF NOT EXISTS idx_drug_master_active ON drug_master(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drug_master_org ON drug_master(organization_id);
CREATE INDEX IF NOT EXISTS idx_drug_master_deleted ON drug_master(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drug_master_request_id ON drug_master(request_id);

-- Full text search on drug names
CREATE INDEX IF NOT EXISTS idx_drug_master_name_search ON drug_master
    USING GIN(to_tsvector('english', generic_name));

-- Drug interactions
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug1 ON drug_interactions(drug_id_1);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug2 ON drug_interactions(drug_id_2);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_severity ON drug_interactions(severity);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_generic1 ON drug_interactions(generic_name_1);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_generic2 ON drug_interactions(generic_name_2);

-- Drug contraindications
CREATE INDEX IF NOT EXISTS idx_drug_contraindications_drug ON drug_contraindications(drug_id);
CREATE INDEX IF NOT EXISTS idx_drug_contraindications_type ON drug_contraindications(contraindication_type);
CREATE INDEX IF NOT EXISTS idx_drug_contraindications_condition ON drug_contraindications(condition_code);

-- Drug allergy mapping
CREATE INDEX IF NOT EXISTS idx_drug_allergy_drug ON drug_allergy_mapping(drug_id);
CREATE INDEX IF NOT EXISTS idx_drug_allergy_class ON drug_allergy_mapping(allergen_class);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_drug_catalogs_updated_at BEFORE UPDATE ON drug_catalogs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drug_schedules_updated_at BEFORE UPDATE ON drug_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drug_master_updated_at BEFORE UPDATE ON drug_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drug_interactions_updated_at BEFORE UPDATE ON drug_interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drug_contraindications_updated_at BEFORE UPDATE ON drug_contraindications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drug_allergy_mapping_updated_at BEFORE UPDATE ON drug_allergy_mapping
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE drug_catalogs IS 'Country/region specific drug catalogs (e.g., Indian Pharmacopoeia, US NDC)';
COMMENT ON TABLE drug_schedules IS 'Regulatory drug schedules per catalog (Schedule H, H1, X for India; Schedule II-V for US)';
COMMENT ON TABLE drug_master IS 'Master drug file with formulation details and regulatory classification';
COMMENT ON TABLE drug_interactions IS 'Drug-drug interaction database with severity levels';
COMMENT ON TABLE drug_contraindications IS 'Drug contraindications by condition';
COMMENT ON TABLE drug_allergy_mapping IS 'Maps drugs to allergen classes for cross-sensitivity checking';

COMMENT ON COLUMN drug_master.vista_ien IS 'VistA Internal Entry Number for integration with ^PSDRUG';
COMMENT ON COLUMN drug_master.atc_code IS 'WHO Anatomical Therapeutic Chemical classification code';
COMMENT ON COLUMN drug_schedules.record_keeping_days IS 'Days to retain prescription records per regulation';

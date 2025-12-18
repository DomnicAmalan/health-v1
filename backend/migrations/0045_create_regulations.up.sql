-- Migration: Create regulations tables
-- Description: Regulation registry with versioning and line-level change tracking
-- Related Entities: 
--   - src/domain/entities/regulation.rs
--   - src/domain/entities/regulation_version.rs
--   - src/domain/entities/regulation_section.rs
--   - src/domain/entities/regulation_change.rs
--
-- Tables Created:
--   - regulations
--   - regulation_versions
--   - regulation_sections
--   - regulation_changes

CREATE TYPE regulation_category AS ENUM (
    'privacy',
    'security',
    'clinical',
    'billing',
    'quality',
    'safety',
    'data_protection',
    'accessibility',
    'other'
);

CREATE TYPE regulation_status AS ENUM (
    'draft',
    'active',
    'superseded',
    'archived'
);

CREATE TYPE change_type AS ENUM (
    'added',
    'modified',
    'deleted'
);

-- Main regulations table
CREATE TABLE IF NOT EXISTS regulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., "HIPAA", "GDPR", "ISO-27001"
    name VARCHAR(255) NOT NULL,
    category regulation_category NOT NULL,
    issuing_body VARCHAR(255) NOT NULL, -- e.g., "HHS", "EU Commission", "ISO"
    jurisdiction_id UUID REFERENCES geographic_regions(id), -- where it applies
    jurisdiction_level geographic_level, -- applies at what level and below
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ, -- NULL means currently active
    status regulation_status NOT NULL DEFAULT 'draft',
    metadata JSONB DEFAULT '{}'::jsonb, -- additional metadata
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

-- Regulation versions table
CREATE TABLE IF NOT EXISTS regulation_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_id UUID NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL, -- e.g., "2024.1", "v3.2"
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for change detection
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ, -- NULL means current version
    change_summary TEXT,
    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    UNIQUE(regulation_id, version_number)
);

-- Regulation sections (articles, clauses, etc.)
CREATE TABLE IF NOT EXISTS regulation_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES regulation_versions(id) ON DELETE CASCADE,
    parent_section_id UUID REFERENCES regulation_sections(id) ON DELETE CASCADE, -- nested sections
    section_number VARCHAR(100) NOT NULL, -- e.g., "164.502(a)(1)"
    title VARCHAR(500),
    content TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    version BIGINT DEFAULT 1 NOT NULL
);

-- Line-level change tracking (git-like diff)
CREATE TABLE IF NOT EXISTS regulation_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES regulation_sections(id) ON DELETE CASCADE,
    from_version_id UUID REFERENCES regulation_versions(id),
    to_version_id UUID NOT NULL REFERENCES regulation_versions(id),
    change_type change_type NOT NULL,
    old_content TEXT,
    new_content TEXT,
    line_start INTEGER,
    line_end INTEGER,
    change_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Audit fields
    request_id VARCHAR(255),
    created_by UUID REFERENCES users(id),
    system_id VARCHAR(255)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_regulations_code ON regulations(code);
CREATE INDEX IF NOT EXISTS idx_regulations_category ON regulations(category);
CREATE INDEX IF NOT EXISTS idx_regulations_status ON regulations(status);
CREATE INDEX IF NOT EXISTS idx_regulations_jurisdiction ON regulations(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_regulations_effective ON regulations(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_regulations_deleted_at ON regulations(deleted_at);

CREATE INDEX IF NOT EXISTS idx_regulation_versions_regulation_id ON regulation_versions(regulation_id);
CREATE INDEX IF NOT EXISTS idx_regulation_versions_version_number ON regulation_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_regulation_versions_effective ON regulation_versions(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_regulation_versions_content_hash ON regulation_versions(content_hash);

CREATE INDEX IF NOT EXISTS idx_regulation_sections_version_id ON regulation_sections(version_id);
CREATE INDEX IF NOT EXISTS idx_regulation_sections_parent_id ON regulation_sections(parent_section_id);
CREATE INDEX IF NOT EXISTS idx_regulation_sections_section_number ON regulation_sections(section_number);
CREATE INDEX IF NOT EXISTS idx_regulation_sections_order ON regulation_sections(version_id, order_index);

CREATE INDEX IF NOT EXISTS idx_regulation_changes_section_id ON regulation_changes(section_id);
CREATE INDEX IF NOT EXISTS idx_regulation_changes_from_version ON regulation_changes(from_version_id);
CREATE INDEX IF NOT EXISTS idx_regulation_changes_to_version ON regulation_changes(to_version_id);
CREATE INDEX IF NOT EXISTS idx_regulation_changes_change_date ON regulation_changes(change_date);

-- Indexes for audit fields
CREATE INDEX IF NOT EXISTS idx_regulations_request_id ON regulations(request_id);
CREATE INDEX IF NOT EXISTS idx_regulations_created_by ON regulations(created_by);
CREATE INDEX IF NOT EXISTS idx_regulation_versions_request_id ON regulation_versions(request_id);
CREATE INDEX IF NOT EXISTS idx_regulation_sections_request_id ON regulation_sections(request_id);

-- Add triggers to update updated_at timestamp
CREATE TRIGGER update_regulations_updated_at BEFORE UPDATE ON regulations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regulation_sections_updated_at BEFORE UPDATE ON regulation_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Migration: Create geographic_regions table
-- Description: Hierarchical geographic regions from continent to village level
-- Related Entity: src/domain/entities/geographic_region.rs
--
-- Tables Created:
--   - geographic_regions
--
-- Indexes Created:
--   - idx_geographic_regions_parent_id (B-tree, on parent_id)
--   - idx_geographic_regions_level (B-tree, on level)
--   - idx_geographic_regions_code (B-tree, on code)
--   - idx_geographic_regions_code_level (B-tree composite, on code, level)
--   - idx_geographic_regions_boundaries (GIST, on boundaries) - for spatial queries
--   - idx_geographic_regions_effective (B-tree, on effective_from, effective_to)

-- Enable PostGIS extension for geometry support
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE geographic_level AS ENUM (
    'continent',
    'country',
    'state',
    'province',
    'city',
    'district',
    'town',
    'village',
    'street'
);

CREATE TABLE IF NOT EXISTS geographic_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES geographic_regions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100), -- ISO codes, postal codes, etc.
    level geographic_level NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- timezone, currency, language, etc.
    boundaries GEOMETRY(POLYGON, 4326), -- PostGIS geometry for geo-detection (optional)
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ, -- NULL means currently active
    version BIGINT DEFAULT 1 NOT NULL,
    -- Audit fields
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    system_id VARCHAR(255),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_geographic_regions_parent_id ON geographic_regions(parent_id);
CREATE INDEX IF NOT EXISTS idx_geographic_regions_level ON geographic_regions(level);
CREATE INDEX IF NOT EXISTS idx_geographic_regions_code ON geographic_regions(code);
CREATE INDEX IF NOT EXISTS idx_geographic_regions_code_level ON geographic_regions(code, level);
CREATE INDEX IF NOT EXISTS idx_geographic_regions_effective ON geographic_regions(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_geographic_regions_deleted_at ON geographic_regions(deleted_at);

-- Spatial index for boundary queries (if PostGIS is available)
CREATE INDEX IF NOT EXISTS idx_geographic_regions_boundaries ON geographic_regions USING GIST(boundaries);

-- Indexes for audit fields
CREATE INDEX IF NOT EXISTS idx_geographic_regions_request_id ON geographic_regions(request_id);
CREATE INDEX IF NOT EXISTS idx_geographic_regions_created_by ON geographic_regions(created_by);
CREATE INDEX IF NOT EXISTS idx_geographic_regions_updated_by ON geographic_regions(updated_by);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_geographic_regions_updated_at BEFORE UPDATE ON geographic_regions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get region hierarchy path (ancestors)
CREATE OR REPLACE FUNCTION get_region_hierarchy(region_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    level geographic_level,
    depth INTEGER
) AS $$
WITH RECURSIVE hierarchy AS (
    -- Base case: start with the given region
    SELECT 
        gr.id,
        gr.name,
        gr.level,
        gr.parent_id,
        0 AS depth
    FROM geographic_regions gr
    WHERE gr.id = region_id AND gr.deleted_at IS NULL
    
    UNION ALL
    
    -- Recursive case: get parent regions
    SELECT 
        gr.id,
        gr.name,
        gr.level,
        gr.parent_id,
        h.depth + 1
    FROM geographic_regions gr
    INNER JOIN hierarchy h ON gr.id = h.parent_id
    WHERE gr.deleted_at IS NULL
)
SELECT 
    h.id,
    h.name,
    h.level,
    h.depth
FROM hierarchy h
ORDER BY h.depth DESC; -- Return from root to leaf
$$ LANGUAGE SQL STABLE;


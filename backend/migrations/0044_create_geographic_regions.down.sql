-- Rollback: Drop geographic_regions table

DROP FUNCTION IF EXISTS get_region_hierarchy(UUID);
DROP TRIGGER IF EXISTS update_geographic_regions_updated_at ON geographic_regions;
DROP TABLE IF EXISTS geographic_regions;
DROP TYPE IF EXISTS geographic_level;


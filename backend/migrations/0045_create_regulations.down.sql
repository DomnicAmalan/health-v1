-- Rollback: Drop regulations tables

DROP TRIGGER IF EXISTS update_regulation_sections_updated_at ON regulation_sections;
DROP TRIGGER IF EXISTS update_regulations_updated_at ON regulations;
DROP TABLE IF EXISTS regulation_changes;
DROP TABLE IF EXISTS regulation_sections;
DROP TABLE IF EXISTS regulation_versions;
DROP TABLE IF EXISTS regulations;
DROP TYPE IF EXISTS change_type;
DROP TYPE IF EXISTS regulation_status;
DROP TYPE IF EXISTS regulation_category;


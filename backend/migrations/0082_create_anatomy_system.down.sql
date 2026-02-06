-- Rollback: Drop anatomy system tables

DROP TRIGGER IF EXISTS update_anatomy_findings_updated_at ON anatomy_findings;
DROP TRIGGER IF EXISTS update_body_systems_updated_at ON body_systems;

DROP TABLE IF EXISTS anatomy_findings CASCADE;
DROP TABLE IF EXISTS body_system_lab_tests CASCADE;
DROP TABLE IF EXISTS body_systems CASCADE;

-- Rollback migration: Drop AppRole tables

DROP TRIGGER IF EXISTS vault_approles_updated_at ON vault_approles;
DROP FUNCTION IF EXISTS update_vault_approles_updated_at();

DROP TABLE IF EXISTS vault_approle_secret_ids;
DROP TABLE IF EXISTS vault_approles;


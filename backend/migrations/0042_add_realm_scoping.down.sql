-- Rollback migration: Remove realm scoping from vault tables

-- Drop vault_realm_auth_methods table
DROP TRIGGER IF EXISTS vault_realm_auth_methods_updated_at ON vault_realm_auth_methods;
DROP FUNCTION IF EXISTS update_vault_realm_auth_methods_updated_at();
DROP TABLE IF EXISTS vault_realm_auth_methods;

-- Drop vault_realm_applications table
DROP TRIGGER IF EXISTS vault_realm_applications_updated_at ON vault_realm_applications;
DROP FUNCTION IF EXISTS update_vault_realm_applications_updated_at();
DROP TABLE IF EXISTS vault_realm_applications;

-- Remove realm_id from vault_auth_methods
DROP INDEX IF EXISTS idx_vault_auth_methods_realm_path;
DROP INDEX IF EXISTS idx_vault_auth_methods_global_path;
DROP INDEX IF EXISTS idx_vault_auth_methods_realm_id;
ALTER TABLE vault_auth_methods DROP COLUMN IF EXISTS realm_id;
CREATE UNIQUE INDEX IF NOT EXISTS vault_auth_methods_path_key ON vault_auth_methods(path);

-- Remove realm_id from vault_mounts
DROP INDEX IF EXISTS idx_vault_mounts_realm_path;
DROP INDEX IF EXISTS idx_vault_mounts_global_path;
DROP INDEX IF EXISTS idx_vault_mounts_realm_id;
ALTER TABLE vault_mounts DROP COLUMN IF EXISTS realm_id;
CREATE UNIQUE INDEX IF NOT EXISTS vault_mounts_path_key ON vault_mounts(path);

-- Remove realm_id and business fields from vault_users
DROP INDEX IF EXISTS idx_vault_users_realm_username;
DROP INDEX IF EXISTS idx_vault_users_global_username;
DROP INDEX IF EXISTS idx_vault_users_realm_id;
DROP INDEX IF EXISTS idx_vault_users_email;
ALTER TABLE vault_users DROP COLUMN IF EXISTS realm_id;
ALTER TABLE vault_users DROP COLUMN IF EXISTS email;
ALTER TABLE vault_users DROP COLUMN IF EXISTS display_name;
ALTER TABLE vault_users DROP COLUMN IF EXISTS is_active;
ALTER TABLE vault_users DROP COLUMN IF EXISTS is_super_user;
CREATE UNIQUE INDEX IF NOT EXISTS vault_users_username_key ON vault_users(username);

-- Remove realm_id from vault_tokens
DROP INDEX IF EXISTS idx_vault_tokens_realm_id;
ALTER TABLE vault_tokens DROP COLUMN IF EXISTS realm_id;

-- Remove realm_id from vault_policies
DROP INDEX IF EXISTS idx_vault_policies_realm_name;
DROP INDEX IF EXISTS idx_vault_policies_global_name;
DROP INDEX IF EXISTS idx_vault_policies_realm_id;
ALTER TABLE vault_policies DROP COLUMN IF EXISTS realm_id;
CREATE UNIQUE INDEX IF NOT EXISTS vault_policies_name_key ON vault_policies(name);

-- Remove organization_id and other columns from vault_realms
DROP INDEX IF EXISTS idx_vault_realms_organization_id;
ALTER TABLE vault_realms DROP COLUMN IF EXISTS organization_id;
ALTER TABLE vault_realms DROP COLUMN IF EXISTS display_name;
ALTER TABLE vault_realms DROP COLUMN IF EXISTS default_lease_ttl;
ALTER TABLE vault_realms DROP COLUMN IF EXISTS max_lease_ttl;
ALTER TABLE vault_realms DROP COLUMN IF EXISTS is_active;
ALTER TABLE vault_realms DROP COLUMN IF EXISTS created_by;
ALTER TABLE vault_realms DROP COLUMN IF EXISTS updated_by;


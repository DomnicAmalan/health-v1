-- Migration: Add realm scoping to vault tables
-- Description: Add organization_id to vault_realms, add realm_id to all vault resources,
--              and create vault_realm_applications table for app registration
-- Related Plan: Realm-Scoped Vault Implementation - Phase 1

-- ============================================================
-- 1. Update vault_realms to include organization_id
-- ============================================================

-- Add organization_id column to vault_realms
ALTER TABLE vault_realms 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add display_name column
ALTER TABLE vault_realms 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Add default_lease_ttl and max_lease_ttl columns
ALTER TABLE vault_realms 
ADD COLUMN IF NOT EXISTS default_lease_ttl INTEGER DEFAULT 3600;

ALTER TABLE vault_realms 
ADD COLUMN IF NOT EXISTS max_lease_ttl INTEGER DEFAULT 86400;

-- Add is_active column
ALTER TABLE vault_realms 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Add audit fields
ALTER TABLE vault_realms 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

ALTER TABLE vault_realms 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Create index on organization_id
CREATE INDEX IF NOT EXISTS idx_vault_realms_organization_id 
ON vault_realms(organization_id);

-- Create unique constraint: one realm per organization (optional - can have multiple realms per org)
-- Not adding unique constraint to allow multiple realms per org

-- ============================================================
-- 2. Add realm_id to vault_policies
-- ============================================================

ALTER TABLE vault_policies 
ADD COLUMN IF NOT EXISTS realm_id UUID REFERENCES vault_realms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_vault_policies_realm_id 
ON vault_policies(realm_id);

-- Drop old unique constraint on name (this will also drop the associated index)
ALTER TABLE vault_policies DROP CONSTRAINT IF EXISTS vault_policies_name_key;
DROP INDEX IF EXISTS vault_policies_name_key;

-- Create new unique constraint: name unique per realm (NULL realm_id = global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_policies_realm_name 
ON vault_policies(realm_id, name) 
WHERE realm_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_policies_global_name 
ON vault_policies(name) 
WHERE realm_id IS NULL;

-- ============================================================
-- 3. Add realm_id to vault_tokens
-- ============================================================

ALTER TABLE vault_tokens 
ADD COLUMN IF NOT EXISTS realm_id UUID REFERENCES vault_realms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_vault_tokens_realm_id 
ON vault_tokens(realm_id);

-- ============================================================
-- 4. Add realm_id to vault_users
-- ============================================================

ALTER TABLE vault_users 
ADD COLUMN IF NOT EXISTS realm_id UUID REFERENCES vault_realms(id) ON DELETE CASCADE;

-- Add additional business fields to vault_users
ALTER TABLE vault_users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE vault_users 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

ALTER TABLE vault_users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE vault_users 
ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN DEFAULT false;

-- Drop old unique constraint on username (this will also drop the associated index)
ALTER TABLE vault_users DROP CONSTRAINT IF EXISTS vault_users_username_key;
DROP INDEX IF EXISTS vault_users_username_key;

-- Create new unique constraint: username unique per realm
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_users_realm_username 
ON vault_users(realm_id, username) 
WHERE realm_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_users_global_username 
ON vault_users(username) 
WHERE realm_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_vault_users_realm_id 
ON vault_users(realm_id);

CREATE INDEX IF NOT EXISTS idx_vault_users_email 
ON vault_users(email);

-- ============================================================
-- 5. Add realm_id to vault_mounts
-- ============================================================

ALTER TABLE vault_mounts 
ADD COLUMN IF NOT EXISTS realm_id UUID REFERENCES vault_realms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_vault_mounts_realm_id 
ON vault_mounts(realm_id);

-- Drop old unique constraint on path (this will also drop the associated index)
ALTER TABLE vault_mounts DROP CONSTRAINT IF EXISTS vault_mounts_path_key;
DROP INDEX IF EXISTS vault_mounts_path_key;

-- Create new unique constraint: path unique per realm
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_mounts_realm_path 
ON vault_mounts(realm_id, path) 
WHERE realm_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_mounts_global_path 
ON vault_mounts(path) 
WHERE realm_id IS NULL;

-- ============================================================
-- 6. Add realm_id to vault_auth_methods
-- ============================================================

ALTER TABLE vault_auth_methods 
ADD COLUMN IF NOT EXISTS realm_id UUID REFERENCES vault_realms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_vault_auth_methods_realm_id 
ON vault_auth_methods(realm_id);

-- Drop old unique constraint on path (this will also drop the associated index)
ALTER TABLE vault_auth_methods DROP CONSTRAINT IF EXISTS vault_auth_methods_path_key;
DROP INDEX IF EXISTS vault_auth_methods_path_key;

-- Create new unique constraint: path unique per realm
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_auth_methods_realm_path 
ON vault_auth_methods(realm_id, path) 
WHERE realm_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_auth_methods_global_path 
ON vault_auth_methods(path) 
WHERE realm_id IS NULL;

-- ============================================================
-- 7. Create vault_realm_applications table
-- ============================================================

CREATE TABLE IF NOT EXISTS vault_realm_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    realm_id UUID REFERENCES vault_realms(id) ON DELETE CASCADE NOT NULL,
    app_name VARCHAR(255) NOT NULL,
    app_type VARCHAR(50) NOT NULL, -- 'admin-ui', 'client-app', 'mobile', 'api'
    display_name VARCHAR(255),
    description TEXT,
    -- App configuration
    config JSONB DEFAULT '{}',
    -- Auth methods allowed for this app
    allowed_auth_methods VARCHAR(50)[] DEFAULT ARRAY['token', 'userpass', 'approle'],
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Audit fields
    request_id VARCHAR(255),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    -- Unique constraint: app_name unique per realm
    UNIQUE(realm_id, app_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vault_realm_apps_realm_id 
ON vault_realm_applications(realm_id);

CREATE INDEX IF NOT EXISTS idx_vault_realm_apps_app_name 
ON vault_realm_applications(app_name);

CREATE INDEX IF NOT EXISTS idx_vault_realm_apps_app_type 
ON vault_realm_applications(app_type);

-- Add check constraint for app_type
ALTER TABLE vault_realm_applications 
ADD CONSTRAINT check_app_type 
CHECK (app_type IN ('admin-ui', 'client-app', 'mobile', 'api', 'service'));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_vault_realm_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vault_realm_applications_updated_at ON vault_realm_applications;
CREATE TRIGGER vault_realm_applications_updated_at
    BEFORE UPDATE ON vault_realm_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_vault_realm_applications_updated_at();

-- ============================================================
-- 8. Create vault_realm_auth_methods table (for realm-specific auth config)
-- ============================================================

CREATE TABLE IF NOT EXISTS vault_realm_auth_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    realm_id UUID REFERENCES vault_realms(id) ON DELETE CASCADE NOT NULL,
    method_type VARCHAR(50) NOT NULL, -- 'userpass', 'approle', 'cert', 'oidc', 'saml'
    mount_path VARCHAR(255) NOT NULL, -- e.g., 'userpass', 'approle'
    config JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Unique constraint: mount_path unique per realm
    UNIQUE(realm_id, mount_path)
);

CREATE INDEX IF NOT EXISTS idx_vault_realm_auth_realm_id 
ON vault_realm_auth_methods(realm_id);

CREATE INDEX IF NOT EXISTS idx_vault_realm_auth_method_type 
ON vault_realm_auth_methods(method_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_vault_realm_auth_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vault_realm_auth_methods_updated_at ON vault_realm_auth_methods;
CREATE TRIGGER vault_realm_auth_methods_updated_at
    BEFORE UPDATE ON vault_realm_auth_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_vault_realm_auth_methods_updated_at();

-- ============================================================
-- Comments for documentation
-- ============================================================

COMMENT ON COLUMN vault_realms.organization_id IS 'Organization that owns this realm (one-to-many relationship)';
COMMENT ON COLUMN vault_policies.realm_id IS 'Realm this policy belongs to (NULL = global policy)';
COMMENT ON COLUMN vault_tokens.realm_id IS 'Realm this token was issued in (NULL = global token)';
COMMENT ON COLUMN vault_users.realm_id IS 'Realm this user belongs to (NULL = global user)';
COMMENT ON COLUMN vault_mounts.realm_id IS 'Realm this mount belongs to (NULL = global mount)';
COMMENT ON COLUMN vault_auth_methods.realm_id IS 'Realm this auth method belongs to (NULL = global auth method)';
COMMENT ON TABLE vault_realm_applications IS 'Applications registered in a realm with their auth method configuration';
COMMENT ON TABLE vault_realm_auth_methods IS 'Authentication methods enabled for a realm with their configuration';


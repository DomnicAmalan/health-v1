-- Migration: Create AppRole authentication tables
-- Description: Tables for AppRole authentication with realm scoping

-- ============================================================
-- 1. Create vault_approles table
-- ============================================================

CREATE TABLE IF NOT EXISTS vault_approles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    realm_id UUID REFERENCES vault_realms(id) ON DELETE CASCADE,
    role_name VARCHAR(255) NOT NULL,
    -- Role ID (static, used to identify the role)
    role_id UUID NOT NULL DEFAULT gen_random_uuid(),
    -- Policies associated with this role
    policies TEXT[] DEFAULT '{}',
    -- Whether to bind secret_id for login
    bind_secret_id BOOLEAN DEFAULT true NOT NULL,
    -- TTL for secret IDs
    secret_id_ttl INTEGER DEFAULT 3600,
    -- Number of uses per secret ID (0 = unlimited)
    secret_id_num_uses INTEGER DEFAULT 0,
    -- Token TTL
    token_ttl INTEGER DEFAULT 3600,
    -- Token max TTL
    token_max_ttl INTEGER DEFAULT 86400,
    -- Token policies (additional policies for tokens)
    token_policies TEXT[] DEFAULT '{}',
    -- Token type (default, batch, service)
    token_type VARCHAR(50) DEFAULT 'default',
    -- CIDR blocks allowed to authenticate
    bound_cidr_list TEXT[],
    -- Metadata to attach to tokens
    token_meta JSONB,
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Audit
    request_id VARCHAR(255),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Unique constraint: role_name unique per realm
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_approles_realm_name 
ON vault_approles(realm_id, role_name) 
WHERE realm_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_approles_global_name 
ON vault_approles(role_name) 
WHERE realm_id IS NULL;

-- Index for role_id lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_approles_role_id 
ON vault_approles(role_id);

CREATE INDEX IF NOT EXISTS idx_vault_approles_realm_id 
ON vault_approles(realm_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_vault_approles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vault_approles_updated_at ON vault_approles;
CREATE TRIGGER vault_approles_updated_at
    BEFORE UPDATE ON vault_approles
    FOR EACH ROW
    EXECUTE FUNCTION update_vault_approles_updated_at();

-- ============================================================
-- 2. Create vault_approle_secret_ids table
-- ============================================================

CREATE TABLE IF NOT EXISTS vault_approle_secret_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approle_id UUID REFERENCES vault_approles(id) ON DELETE CASCADE NOT NULL,
    -- Secret ID hash (we never store the plain secret)
    secret_id_hash VARCHAR(255) NOT NULL,
    -- Accessor for the secret ID
    accessor UUID NOT NULL DEFAULT gen_random_uuid(),
    -- Metadata
    metadata JSONB,
    -- CIDR blocks allowed
    cidr_list TEXT[],
    -- Number of uses remaining (-1 = unlimited)
    num_uses_remaining INTEGER DEFAULT -1,
    -- Expiration time
    expires_at TIMESTAMPTZ,
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Index on approle_id
CREATE INDEX IF NOT EXISTS idx_vault_approle_secret_ids_approle_id 
ON vault_approle_secret_ids(approle_id);

-- Index on secret_id_hash for login
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_approle_secret_ids_hash 
ON vault_approle_secret_ids(secret_id_hash);

-- Index on accessor for lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_approle_secret_ids_accessor 
ON vault_approle_secret_ids(accessor);

-- Index on expiration for cleanup
CREATE INDEX IF NOT EXISTS idx_vault_approle_secret_ids_expires 
ON vault_approle_secret_ids(expires_at);

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE vault_approles IS 'AppRole authentication roles for machine-to-machine authentication';
COMMENT ON TABLE vault_approle_secret_ids IS 'Secret IDs associated with AppRole roles';
COMMENT ON COLUMN vault_approles.role_id IS 'Static identifier for the role, used in login requests';
COMMENT ON COLUMN vault_approles.bind_secret_id IS 'Whether a secret_id is required to authenticate';
COMMENT ON COLUMN vault_approles.secret_id_num_uses IS 'Number of uses per secret ID (0 = unlimited)';
COMMENT ON COLUMN vault_approle_secret_ids.num_uses_remaining IS 'Number of remaining uses (-1 = unlimited)';


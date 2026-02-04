-- Create Vault Audit Logs table for HIPAA compliance
-- Tracks ALL vault operations: authentication, authorization, secret access, admin operations
-- Retention: 7 years (2,555 days) per HIPAA requirements

CREATE TABLE IF NOT EXISTS vault_audit_logs (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_id UUID NOT NULL,

    -- Operation details
    operation TEXT NOT NULL, -- 'auth.login', 'auth.token_create', 'secret.read', 'secret.write', etc.
    path TEXT NOT NULL, -- Vault path accessed (e.g., 'secret/data/test')
    method TEXT NOT NULL, -- HTTP method: GET, POST, PUT, DELETE

    -- Authentication context
    auth_display_name TEXT, -- Token display name
    auth_policies TEXT[], -- Policies attached to the token
    auth_token_id UUID, -- Token ID (NOT the token itself)
    client_token_hash TEXT, -- SHA256 hash of client token for correlation

    -- Authorization result
    auth_result TEXT NOT NULL, -- 'allowed', 'denied', 'error'
    acl_capabilities TEXT[], -- ACL capabilities evaluated

    -- Multi-tenancy
    realm_id UUID REFERENCES vault_realms(id) ON DELETE SET NULL,
    realm_name TEXT,

    -- Request metadata
    request_data JSONB, -- Sanitized request body (PHI removed/masked)
    request_remote_addr TEXT, -- Client IP address
    request_user_agent TEXT, -- User agent string

    -- Response metadata
    response_status INT, -- HTTP status code
    response_error TEXT, -- Error message if failed
    duration_ms INT, -- Request duration in milliseconds

    -- PHI tracking (CRITICAL for HIPAA)
    phi_accessed BOOLEAN DEFAULT FALSE, -- Was PHI accessed?
    phi_field_names TEXT[], -- Which PHI fields were accessed (e.g., ['ssn', 'dob'])
    phi_record_ids TEXT[], -- IDs of records with PHI accessed

    -- Tamper protection (log chain integrity)
    log_hash TEXT NOT NULL, -- SHA256 hash of this log entry
    previous_log_hash TEXT -- Hash of previous log entry (blockchain-style)
);

-- Indexes for efficient querying and HIPAA compliance reporting
CREATE INDEX idx_vault_audit_timestamp ON vault_audit_logs(timestamp DESC);
CREATE INDEX idx_vault_audit_token ON vault_audit_logs(client_token_hash) WHERE client_token_hash IS NOT NULL;
CREATE INDEX idx_vault_audit_realm ON vault_audit_logs(realm_id) WHERE realm_id IS NOT NULL;
CREATE INDEX idx_vault_audit_phi ON vault_audit_logs(phi_accessed) WHERE phi_accessed = TRUE;
CREATE INDEX idx_vault_audit_operation ON vault_audit_logs(operation);
CREATE INDEX idx_vault_audit_path ON vault_audit_logs(path);
CREATE INDEX idx_vault_audit_request_id ON vault_audit_logs(request_id);
CREATE INDEX idx_vault_audit_auth_result ON vault_audit_logs(auth_result);

-- Prevent deletion or modification of audit logs (append-only)
CREATE OR REPLACE FUNCTION prevent_vault_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Deletion of vault audit logs is not permitted (HIPAA compliance)';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Modification of vault audit logs is not permitted (HIPAA compliance)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_vault_audit_log_modification
    BEFORE UPDATE OR DELETE ON vault_audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_vault_audit_modification();

-- Automatic cleanup of logs older than 7 years (2,555 days)
-- Run this as a scheduled job, NOT a trigger
CREATE OR REPLACE FUNCTION cleanup_old_vault_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM vault_audit_logs
    WHERE timestamp < NOW() - INTERVAL '2555 days'
    RETURNING COUNT(*) INTO deleted_count;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE vault_audit_logs IS 'HIPAA-compliant audit trail for all RustyVault operations. Retention: 7 years. Append-only (no updates/deletes allowed).';
COMMENT ON COLUMN vault_audit_logs.phi_accessed IS 'TRUE if operation accessed Protected Health Information (PHI)';
COMMENT ON COLUMN vault_audit_logs.log_hash IS 'SHA256 hash for tamper detection';
COMMENT ON COLUMN vault_audit_logs.previous_log_hash IS 'Hash chain for log integrity verification';

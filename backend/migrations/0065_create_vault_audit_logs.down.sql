-- Drop Vault audit logs table and related functions

DROP TRIGGER IF EXISTS prevent_vault_audit_log_modification ON vault_audit_logs;
DROP FUNCTION IF EXISTS prevent_vault_audit_modification();
DROP FUNCTION IF EXISTS cleanup_old_vault_audit_logs();
DROP TABLE IF EXISTS vault_audit_logs;

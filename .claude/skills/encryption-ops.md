# Encryption Operations Skill

Manage Data Encryption Keys (DEK), Master Key rotation, and encryption infrastructure for PHI protection.

## What This Skill Does

1. Reviews encryption configuration
2. Guides DEK rotation procedures
3. Manages master key operations
4. Monitors encryption statistics
5. Troubleshoots encryption issues

## Reference Files

- `cli/packages/apps/admin/src/lib/api/encryption.ts` - Encryption API client
- `cli/packages/libs/shared/src/api/routes.ts` - API endpoints
- `backend/shared/` - Backend encryption implementation
- `backend/rustyvault-service/` - Vault service for key management

## API Endpoints

```typescript
ENCRYPTION: {
  // DEK Management
  DEK_STATUS: (userId: string) => `/v1/admin/encryption/deks/${userId}/status`,
  DEK_LIST: "/v1/admin/encryption/deks",
  DEK_ROTATE: "/v1/admin/encryption/deks/rotate",

  // Master Key Management
  MASTER_KEY_STATUS: "/v1/admin/encryption/master-key/status",
  MASTER_KEY_ROTATE: "/v1/admin/encryption/master-key/rotate",

  // Statistics
  STATS: "/v1/admin/encryption/stats",
}
```

## DEK (Data Encryption Key) Operations

### Check DEK Status
```typescript
// Get DEK status for a specific user
const status = await encryptionClient.getDekStatus(userId);
// Returns: { exists: boolean, rotatedAt?: string, version?: number }
```

### List All DEK Statuses
```typescript
// Get overview of all users' DEK status
const statuses = await encryptionClient.listDekStatuses();
// Returns: Array<{ userId: string, exists: boolean, rotatedAt?: string }>
```

### Rotate User DEK
```typescript
// Rotate DEK for a specific user
await encryptionClient.rotateUserDek(userId, "Routine rotation");
// Requires: Admin permissions
// Triggers: Re-encryption of user's PHI data
```

## Master Key Operations

### Check Master Key Status
```typescript
const status = await encryptionClient.getMasterKeyStatus();
// Returns: {
//   exists: boolean,
//   rotatedAt?: string,
//   rotationCount: number,
//   algorithm: string
// }
```

### Rotate Master Key
```typescript
await encryptionClient.rotateMasterKey();
// WARNING: This operation:
// 1. Generates new master key
// 2. Re-wraps all DEKs with new master key
// 3. May take significant time for large deployments
// 4. Requires careful coordination
```

## Encryption Statistics

```typescript
const stats = await encryptionClient.getStats();
// Returns: {
//   totalUsers: number,
//   usersWithDek: number,
//   usersWithoutDek: number,
//   dekRotationsPast30Days: number,
//   masterKeyRotations: number,
//   lastMasterKeyRotation?: string
// }
```

## Key Rotation Procedures

### Routine DEK Rotation (Recommended: Quarterly)

1. **Pre-rotation checks**:
   - Verify backup of current encrypted data
   - Check system health and load
   - Notify affected users if applicable

2. **Rotation execution**:
   ```bash
   # Via API
   POST /v1/admin/encryption/deks/rotate
   Body: { "userId": "...", "reason": "Quarterly rotation" }
   ```

3. **Post-rotation verification**:
   - Verify data accessibility
   - Check audit logs for rotation entry
   - Confirm new DEK version

### Master Key Rotation (Emergency or Annual)

1. **Pre-rotation (CRITICAL)**:
   - Full system backup
   - Schedule maintenance window
   - Prepare rollback procedure
   - Notify all administrators

2. **Rotation**:
   ```bash
   POST /v1/admin/encryption/master-key/rotate
   # No body required
   ```

3. **Post-rotation**:
   - Verify all DEKs re-wrapped
   - Test data access across all users
   - Update key escrow/backup
   - Document rotation in compliance records

## Troubleshooting

### DEK Not Found
```
Error: DEK not found for user
Solution:
1. Check if user was created before DEK system
2. Run DEK provisioning for user
3. Check encryption service logs
```

### Decryption Failure
```
Error: Unable to decrypt data
Possible causes:
1. DEK was rotated but data not re-encrypted
2. Master key mismatch
3. Corrupted encrypted data

Resolution:
1. Check DEK version matches data version
2. Verify master key status
3. Check backup for data recovery
```

### Master Key Unavailable
```
Error: Master key not accessible
Immediate actions:
1. Check vault service health
2. Verify vault unsealed
3. Check network connectivity to vault
4. Review vault audit logs
```

## Compliance Requirements

- **HIPAA 164.312(a)(2)(iv)**: Encryption of PHI at rest
- **Key rotation**: Recommended quarterly for DEKs, annually for master key
- **Audit trail**: All key operations must be logged
- **Key escrow**: Master key backup in secure location

## Execution Steps

1. Ask user what encryption operation they need
2. Read current encryption status via API
3. Verify prerequisites for requested operation
4. Execute operation with proper audit logging
5. Verify operation success
6. Document in compliance records if required

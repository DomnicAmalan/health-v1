# Vault Flow Test Plan

## Overview

This document describes the complete vault flow from initialization to realm management, user creation, and policy assignment.

## Flow Summary

### 1. Vault Initialization
- **Endpoint**: `POST /v1/sys/init`
- **Request**: `{ "secret_shares": 5, "secret_threshold": 3 }`
- **Response**: 
  - `root_token`: Token for authentication
  - `keys`: Array of 5 base64-encoded unseal keys
  - `keys_base64`: Same as keys
  - `download_token`: Token to download keys file
- **State**: Vault is **sealed** after initialization (security)

### 2. Authentication
- **Method**: Use `root_token` from initialization
- **Header**: `X-Vault-Token: <root_token>`
- **Required for**: All operations except initialization and unsealing

### 3. Sealing/Unsealing
- **Seal**: `POST /v1/sys/seal` (requires authentication)
  - Vault becomes sealed, all operations blocked except unseal
- **Unseal**: `POST /v1/sys/unseal` with `{ "key": "<base64_key>" }`
  - Requires **threshold** number of keys (default: 3 of 5)
  - Progress tracked: 1/3, 2/3, 3/3 → unsealed
  - Duplicate keys don't count
  - Keys are cleared after successful unseal

### 4. Realm Management

#### Global Realm
- **Definition**: `organization_id = NULL`
- **Purpose**: System-wide operations, no organization scoping
- **Path**: Operations without `/realm/{realm_id}` prefix
- **Example**: `POST /v1/auth/userpass/users/{username}`

#### Single Realm (Organization-Scoped)
- **Definition**: `organization_id = <uuid>`
- **Purpose**: Isolated namespace for an organization
- **Path**: Operations with `/realm/{realm_id}` prefix
- **Example**: `POST /v1/realm/{realm_id}/auth/userpass/users/{username}`

#### Realm Operations
- **Create**: `POST /v1/sys/realm`
- **List**: `GET /v1/sys/realm`
- **Get**: `GET /v1/sys/realm/{realm_id}`
- **Get by Organization**: `GET /v1/sys/realm/organization/{org_id}`
- **Update**: `POST /v1/sys/realm/{realm_id}`
- **Delete**: `DELETE /v1/sys/realm/{realm_id}`

### 5. App Registration

#### Default Apps
- **Endpoint**: `POST /v1/realm/{realm_id}/sys/apps/register-defaults`
- **Creates**:
  - `admin-ui`: Admin interface (auth: token, userpass)
  - `client-app`: Client application (auth: token, userpass)
  - `mobile`: Mobile app (auth: token, approle)

#### Custom Apps
- **Endpoint**: `POST /v1/realm/{realm_id}/sys/apps`
- **Request**:
  ```json
  {
    "app_name": "custom-api",
    "app_type": "api",
    "display_name": "Custom API",
    "allowed_auth_methods": ["token", "approle"],
    "config": {}
  }
  ```

#### App Types
- `admin-ui`: Admin interface
- `client-app`: Client application
- `mobile`: Mobile application
- `api`: API service
- `service`: Backend service

### 6. User Creation

#### For Realm (Scoped)
- **Endpoint**: `POST /v1/realm/{realm_id}/auth/userpass/users/{username}`
- **Request**:
  ```json
  {
    "password": "secure-password",
    "policies": ["policy1", "policy2"],
    "ttl": 3600,
    "max_ttl": 86400
  }
  ```
- **User is scoped to realm**: `realm_id` is set

#### For Global Realm
- **Endpoint**: `POST /v1/auth/userpass/users/{username}`
- **User is global**: `realm_id = NULL`

#### User Authentication
- **Endpoint**: `POST /v1/realm/{realm_id}/auth/userpass/login/{username}`
- **Request**: `{ "password": "secure-password" }`
- **Response**: 
  ```json
  {
    "auth": {
      "client_token": "token",
      "policies": ["policy1", "policy2"],
      "lease_duration": 3600
    }
  }
  ```

### 7. Policy Management

#### Create Policy
- **Endpoint**: `POST /v1/realm/{realm_id}/sys/policies/{policy_name}`
- **Request**:
  ```json
  {
    "policy": "path \"secret/data/*\" {\n  capabilities = [\"read\", \"list\"]\n}"
  }
  ```

#### Role-Based Policy Naming
- **Format**: `{role}-{app}-realm-{realm_id}`
- **Example**: `admin-client-app-realm-{realm_id}`
- **Purpose**: Granular access control per role, app, and realm

#### Policy Assignment
- Assign to user during creation or update
- User's token includes all assigned policies

### 8. Complete Flow Example

```bash
# 1. Initialize vault
POST /v1/sys/init
→ Get root_token + 5 keys

# 2. Unseal vault (3 keys)
POST /v1/sys/unseal { "key": "key1" } → progress: 1/3
POST /v1/sys/unseal { "key": "key2" } → progress: 2/3
POST /v1/sys/unseal { "key": "key3" } → progress: 3/3, sealed: false

# 3. Authenticate
Header: X-Vault-Token: <root_token>

# 4. Create realm
POST /v1/sys/realm
{
  "name": "org-realm",
  "organization_id": "<org_uuid>"
}
→ Get realm_id

# 5. Register apps
POST /v1/realm/{realm_id}/sys/apps/register-defaults
→ Creates admin-ui, client-app, mobile

# 6. Create user
POST /v1/realm/{realm_id}/auth/userpass/users/testuser
{
  "password": "password123",
  "policies": ["default"]
}

# 7. Create policy
POST /v1/realm/{realm_id}/sys/policies/app-policy
{
  "policy": "path \"secret/data/*\" { capabilities = [\"read\"] }"
}

# 8. Assign policy to user
POST /v1/realm/{realm_id}/auth/userpass/users/testuser
{
  "policies": ["default", "app-policy"]
}

# 9. Authenticate user
POST /v1/realm/{realm_id}/auth/userpass/login/testuser
{
  "password": "password123"
}
→ Get user token with policies
```

## Test Cases

See `vault_flow_test.rs` for comprehensive test cases covering:

1. ✅ Vault initialization
2. ✅ Authentication with root token
3. ✅ Seal vault
4. ✅ Unseal vault with threshold keys
5. ✅ Unseal with duplicate key (should fail)
6. ✅ Unseal with insufficient keys
7. ✅ Create global realm
8. ✅ Create single realm (organization-scoped)
9. ✅ Register apps in realm
10. ✅ Create custom app in realm
11. ✅ Create user for realm
12. ✅ Create user for global realm
13. ✅ Create policy for realm
14. ✅ Create role-based policy
15. ✅ Complete end-to-end flow
16. ✅ Realm isolation
17. ✅ Global vs single realm

## Key Concepts

### Sealing/Unsealing
- **Sealed**: Vault is locked, no operations allowed (except unseal)
- **Unsealed**: Vault is operational
- **Shamir Secret Sharing**: Keys split into shares, threshold needed to combine
- **Security**: Vault auto-seals after initialization

### Realm Isolation
- Each realm is completely isolated
- Users in realm1 cannot access realm2 resources
- Policies are realm-scoped
- Apps are realm-scoped

### Global vs Single Realm
- **Global**: `organization_id = NULL`, system-wide
- **Single**: `organization_id = <uuid>`, organization-scoped
- Path determines scope: `/v1/...` = global, `/v1/realm/{realm_id}/...` = scoped

### Policy Naming Convention
- **Format**: `{role}-{app}-realm-{realm_id}`
- **Example**: `admin-client-app-realm-123e4567-e89b-12d3-a456-426614174000`
- Allows granular access control per role, application, and realm

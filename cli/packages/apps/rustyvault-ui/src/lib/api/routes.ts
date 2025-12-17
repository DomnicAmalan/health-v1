/**
 * Lazarus Life Vault API Routes
 * Centralized constants for all Lazarus Life Vault service endpoints
 *
 * Note: The base URL already includes /v1, so routes here are relative
 * (e.g., '/sys/health' becomes '/v1/sys/health')
 */

export const VAULT_ROUTES = {
  // System routes
  SYS: {
    HEALTH: "/sys/health",
    SEAL_STATUS: "/sys/seal-status",
    SEAL: "/sys/seal",
    UNSEAL: "/sys/unseal",
    INIT: "/sys/init",
    KEYS_DOWNLOAD: "/sys/init/keys.txt",
    KEYS_AUTH: "/sys/init/keys",
    MOUNTS: "/sys/mounts",
    MOUNT: (path: string) => `/sys/mounts/${path}`,
    AUTH: "/sys/auth",
    AUTH_METHOD: (path: string) => `/sys/auth/${path}`,
  },

  // Auth routes
  AUTH: {
    USERPASS_LOGIN: (username: string) => `/auth/userpass/login/${username}`,
    USERPASS_USERS: "/auth/userpass/users",
    USERPASS_USER: (username: string) => `/auth/userpass/users/${username}`,
    APPROLE_LOGIN: "/auth/approle/login",
    TOKEN_CREATE: "/auth/token/create",
    TOKEN_LOOKUP: "/auth/token/lookup",
    TOKEN_LOOKUP_SELF: "/auth/token/lookup-self",
    TOKEN_RENEW: "/auth/token/renew",
    TOKEN_RENEW_SELF: "/auth/token/renew-self",
    TOKEN_REVOKE: "/auth/token/revoke",
    TOKEN_REVOKE_SELF: "/auth/token/revoke-self",
  },

  // Policy routes (global)
  POLICIES: {
    LIST: "/sys/policies/acl",
    GET: (name: string) => `/sys/policies/acl/${name}`,
    CREATE: (name: string) => `/sys/policies/acl/${name}`,
    UPDATE: (name: string) => `/sys/policies/acl/${name}`,
    DELETE: (name: string) => `/sys/policies/acl/${name}`,
    CAPABILITIES: "/sys/capabilities",
  },

  // Secret routes (global, KV v1)
  SECRETS: {
    READ: (path: string) => `/secret/${path}`,
    WRITE: (path: string) => `/secret/${path}`,
    DELETE: (path: string) => `/secret/${path}`,
    LIST: (path: string = "") => (path ? `/secret/${path}/` : "/secret/"),
  },

  // Realm routes
  REALMS: {
    LIST: "/sys/realm",
    CREATE: "/sys/realm",
    GET: (id: string) => `/sys/realm/${id}`,
    UPDATE: (id: string) => `/sys/realm/${id}`,
    DELETE: (id: string) => `/sys/realm/${id}`,
    BY_ORG: (orgId: string) => `/sys/realm/organization/${orgId}`,
  },

  // Realm-scoped Applications
  REALM_APPS: {
    LIST: (realmId: string) => `/realm/${realmId}/sys/apps`,
    CREATE: (realmId: string) => `/realm/${realmId}/sys/apps`,
    GET: (realmId: string, appName: string) => `/realm/${realmId}/sys/apps/${appName}`,
    UPDATE: (realmId: string, appName: string) => `/realm/${realmId}/sys/apps/${appName}`,
    DELETE: (realmId: string, appName: string) => `/realm/${realmId}/sys/apps/${appName}`,
    REGISTER_DEFAULTS: (realmId: string) => `/realm/${realmId}/sys/apps/register-defaults`,
  },

  // Realm-scoped AppRole
  REALM_APPROLE: {
    LIST_ROLES: (realmId: string) => `/realm/${realmId}/auth/approle/role`,
    CREATE_ROLE: (realmId: string, roleName: string) =>
      `/realm/${realmId}/auth/approle/role/${roleName}`,
    GET_ROLE: (realmId: string, roleName: string) =>
      `/realm/${realmId}/auth/approle/role/${roleName}`,
    DELETE_ROLE: (realmId: string, roleName: string) =>
      `/realm/${realmId}/auth/approle/role/${roleName}`,
    GET_ROLE_ID: (realmId: string, roleName: string) =>
      `/realm/${realmId}/auth/approle/role/${roleName}/role-id`,
    GENERATE_SECRET_ID: (realmId: string, roleName: string) =>
      `/realm/${realmId}/auth/approle/role/${roleName}/secret-id`,
    LOGIN: (realmId: string) => `/realm/${realmId}/auth/approle/login`,
  },

  // Realm-scoped Policies
  REALM_POLICIES: {
    LIST: (realmId: string) => `/realm/${realmId}/sys/policies/acl`,
    GET: (realmId: string, name: string) => `/realm/${realmId}/sys/policies/acl/${name}`,
    CREATE: (realmId: string, name: string) => `/realm/${realmId}/sys/policies/acl/${name}`,
    UPDATE: (realmId: string, name: string) => `/realm/${realmId}/sys/policies/acl/${name}`,
    DELETE: (realmId: string, name: string) => `/realm/${realmId}/sys/policies/acl/${name}`,
    CAPABILITIES: (realmId: string) => `/realm/${realmId}/sys/capabilities`,
  },

  // Realm-scoped Secrets
  REALM_SECRETS: {
    READ: (realmId: string, path: string) => `/realm/${realmId}/secret/data/${path}`,
    WRITE: (realmId: string, path: string) => `/realm/${realmId}/secret/data/${path}`,
    DELETE: (realmId: string, path: string) => `/realm/${realmId}/secret/data/${path}`,
    LIST: (realmId: string, path: string = "") =>
      path ? `/realm/${realmId}/secret/metadata/${path}` : `/realm/${realmId}/secret/metadata/`,
  },

  // Realm-scoped Users (UserPass auth)
  REALM_USERS: {
    LIST: (realmId: string) => `/realm/${realmId}/auth/userpass/users`,
    GET: (realmId: string, username: string) => `/realm/${realmId}/auth/userpass/users/${username}`,
    CREATE: (realmId: string, username: string) =>
      `/realm/${realmId}/auth/userpass/users/${username}`,
    UPDATE: (realmId: string, username: string) =>
      `/realm/${realmId}/auth/userpass/users/${username}`,
    DELETE: (realmId: string, username: string) =>
      `/realm/${realmId}/auth/userpass/users/${username}`,
    LOGIN: (realmId: string, username: string) =>
      `/realm/${realmId}/auth/userpass/login/${username}`,
  },
} as const;

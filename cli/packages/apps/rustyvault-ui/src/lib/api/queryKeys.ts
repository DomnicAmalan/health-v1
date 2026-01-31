/**
 * Vault Query Key Factories
 * Hierarchical query keys for better cache management and invalidation
 * Based on TanStack Query best practices
 */

/**
 * Query key factory for secrets
 * Supports global vs realm-scoped secrets
 */
export const SECRETS_QUERY_KEYS = {
  all: ["secrets"] as const,
  lists: () => [...SECRETS_QUERY_KEYS.all, "list"] as const,
  list: (params: {
    path: string;
    realmId?: string;
    isGlobal: boolean;
  }) => [...SECRETS_QUERY_KEYS.lists(), params] as const,
  details: () => [...SECRETS_QUERY_KEYS.all, "detail"] as const,
  detail: (params: {
    name: string;
    realmId?: string;
    isGlobal: boolean;
  }) => [...SECRETS_QUERY_KEYS.details(), params] as const,
};

/**
 * Query key factory for policies
 */
export const POLICIES_QUERY_KEYS = {
  all: ["policies"] as const,
  lists: () => [...POLICIES_QUERY_KEYS.all, "list"] as const,
  list: (params: {
    realmId?: string;
    isGlobal: boolean;
  }) => [...POLICIES_QUERY_KEYS.lists(), params] as const,
  details: () => [...POLICIES_QUERY_KEYS.all, "detail"] as const,
  detail: (params: {
    name: string;
    realmId?: string;
    isGlobal: boolean;
  }) => [...POLICIES_QUERY_KEYS.details(), params] as const,
};

/**
 * Query key factory for users
 */
export const USERS_QUERY_KEYS = {
  all: ["users"] as const,
  lists: () => [...USERS_QUERY_KEYS.all, "list"] as const,
  list: (params: {
    realmId?: string;
    isGlobal: boolean;
  }) => [...USERS_QUERY_KEYS.lists(), params] as const,
  details: () => [...USERS_QUERY_KEYS.all, "detail"] as const,
  detail: (params: {
    username: string;
    realmId?: string;
    isGlobal: boolean;
  }) => [...USERS_QUERY_KEYS.details(), params] as const,
};

/**
 * Query key factory for AppRoles
 */
export const APPROLES_QUERY_KEYS = {
  all: ["approles"] as const,
  lists: () => [...APPROLES_QUERY_KEYS.all, "list"] as const,
  list: (params: {
    realmId?: string;
    isGlobal: boolean;
  }) => [...APPROLES_QUERY_KEYS.lists(), params] as const,
  details: () => [...APPROLES_QUERY_KEYS.all, "detail"] as const,
  detail: (params: {
    name: string;
    realmId?: string;
    isGlobal: boolean;
  }) => [...APPROLES_QUERY_KEYS.details(), params] as const,
  secretIds: (params: {
    name: string;
    realmId?: string;
    isGlobal: boolean;
  }) => [...APPROLES_QUERY_KEYS.details(), params, "secretIds"] as const,
};

/**
 * Query key factory for applications
 */
export const APPLICATIONS_QUERY_KEYS = {
  all: ["realm-apps"] as const,
  lists: () => [...APPLICATIONS_QUERY_KEYS.all, "list"] as const,
  list: (realmId: string) => [...APPLICATIONS_QUERY_KEYS.lists(), realmId] as const,
  details: () => [...APPLICATIONS_QUERY_KEYS.all, "detail"] as const,
  detail: (appId: string, realmId: string) =>
    [...APPLICATIONS_QUERY_KEYS.details(), realmId, appId] as const,
};

/**
 * Query key factory for realms
 */
export const REALMS_QUERY_KEYS = {
  all: ["realms"] as const,
  lists: () => [...REALMS_QUERY_KEYS.all, "list"] as const,
  list: () => [...REALMS_QUERY_KEYS.lists()] as const,
  details: () => [...REALMS_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...REALMS_QUERY_KEYS.details(), id] as const,
};

/**
 * Query key factory for tokens
 */
export const TOKENS_QUERY_KEYS = {
  all: ["tokens"] as const,
  lookup: (token: string) => [...TOKENS_QUERY_KEYS.all, "lookup", token] as const,
  lookupSelf: () => [...TOKENS_QUERY_KEYS.all, "lookup-self"] as const,
};

/**
 * Query key factory for system status
 */
export const SYSTEM_QUERY_KEYS = {
  all: ["system"] as const,
  health: () => [...SYSTEM_QUERY_KEYS.all, "health"] as const,
  sealStatus: () => [...SYSTEM_QUERY_KEYS.all, "seal-status"] as const,
  mounts: () => [...SYSTEM_QUERY_KEYS.all, "mounts"] as const,
};

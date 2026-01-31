/**
 * Admin Query Key Factories
 * Hierarchical query keys for better cache management and invalidation
 * Based on TanStack Query best practices
 */

/**
 * Query key factory for users
 */
export const USERS_QUERY_KEYS = {
  all: ["users"] as const,
  lists: () => [...USERS_QUERY_KEYS.all, "list"] as const,
  list: (filters?: { searchTerm?: string }) => [...USERS_QUERY_KEYS.lists(), { filters }] as const,
  details: () => [...USERS_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...USERS_QUERY_KEYS.details(), id] as const,
};

/**
 * Query key factory for organizations
 */
export const ORGANIZATIONS_QUERY_KEYS = {
  all: ["organizations"] as const,
  lists: () => [...ORGANIZATIONS_QUERY_KEYS.all, "list"] as const,
  list: () => [...ORGANIZATIONS_QUERY_KEYS.lists()] as const,
  details: () => [...ORGANIZATIONS_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...ORGANIZATIONS_QUERY_KEYS.details(), id] as const,
};

/**
 * Query key factory for groups
 */
export const GROUPS_QUERY_KEYS = {
  all: ["groups"] as const,
  lists: () => [...GROUPS_QUERY_KEYS.all, "list"] as const,
  list: () => [...GROUPS_QUERY_KEYS.lists()] as const,
  details: () => [...GROUPS_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...GROUPS_QUERY_KEYS.details(), id] as const,
};

/**
 * Query key factory for permissions
 */
export const PERMISSIONS_QUERY_KEYS = {
  all: ["permissions"] as const,
  user: (userId: string) => [...PERMISSIONS_QUERY_KEYS.all, "user", userId] as const,
  userPages: (userId: string) => [...PERMISSIONS_QUERY_KEYS.all, "user", userId, "pages"] as const,
  userButtons: (userId: string, page: string) =>
    [...PERMISSIONS_QUERY_KEYS.all, "user", userId, "buttons", page] as const,
  userFields: (userId: string, page: string) =>
    [...PERMISSIONS_QUERY_KEYS.all, "user", userId, "fields", page] as const,
};

/**
 * Query key factory for Zanzibar relationships
 */
export const ZANZIBAR_QUERY_KEYS = {
  all: ["zanzibarRelationships"] as const,
  lists: () => [...ZANZIBAR_QUERY_KEYS.all, "list"] as const,
  list: () => [...ZANZIBAR_QUERY_KEYS.lists()] as const,
};

/**
 * Query key factory for services
 */
export const SERVICES_QUERY_KEYS = {
  all: ["services"] as const,
  status: () => [...SERVICES_QUERY_KEYS.all, "status"] as const,
  lists: () => [...SERVICES_QUERY_KEYS.all, "list"] as const,
  list: () => [...SERVICES_QUERY_KEYS.lists()] as const,
};

/**
 * Query key factory for setup
 */
export const SETUP_QUERY_KEYS = {
  all: ["setup"] as const,
  status: () => [...SETUP_QUERY_KEYS.all, "status"] as const,
};

/**
 * Query key factory for compliance/regulations
 */
export const REGULATIONS_QUERY_KEYS = {
  all: ["regulations"] as const,
  lists: () => [...REGULATIONS_QUERY_KEYS.all, "list"] as const,
  list: (filters?: { status?: string }) => [...REGULATIONS_QUERY_KEYS.lists(), { filters }] as const,
};

/**
 * Query key factory for app access matrix
 */
export const APP_ACCESS_QUERY_KEYS = {
  all: ["app-access-matrix"] as const,
  lists: () => [...APP_ACCESS_QUERY_KEYS.all, "list"] as const,
  list: (orgId?: string) => [...APP_ACCESS_QUERY_KEYS.lists(), { orgId }] as const,
};

/**
 * Query key factory for encryption/DEK operations
 */
export const ENCRYPTION_QUERY_KEYS = {
  all: ["encryption"] as const,
  deks: () => [...ENCRYPTION_QUERY_KEYS.all, "deks"] as const,
  deksList: () => [...ENCRYPTION_QUERY_KEYS.deks(), "list"] as const,
  masterKeys: () => [...ENCRYPTION_QUERY_KEYS.all, "masterKeys"] as const,
};

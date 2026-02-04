/**
 * Query Key Factory Generator
 *
 * Creates standardized query key structures for TanStack Query to eliminate
 * 25+ duplicate query key definitions across EHR, billing, and admin hooks.
 *
 * @example
 * ```typescript
 * // Before: 8-10 lines of query key definitions
 * export const EHR_PATIENT_QUERY_KEYS = {
 *   all: ["ehr", "patients"] as const,
 *   lists: () => [...EHR_PATIENT_QUERY_KEYS.all, "list"] as const,
 *   list: (params) => [...EHR_PATIENT_QUERY_KEYS.lists(), params] as const,
 *   // ... 6 more lines
 * };
 *
 * // After: 1 line
 * export const EHR_PATIENT_QUERY_KEYS = createQueryKeyFactory("ehr", "patients");
 * ```
 *
 * @param domain - The domain scope (e.g., "ehr", "billing", "admin")
 * @param resource - The resource name (e.g., "patients", "appointments", "users")
 * @returns A query key factory with standardized methods
 */
export function createQueryKeyFactory<T extends string>(
  domain: string,
  resource: string
) {
  return {
    /**
     * Base key for all queries in this domain/resource
     * @example ["ehr", "patients"]
     */
    all: [domain, resource] as const,

    /**
     * Key for all list queries (without params)
     * @example ["ehr", "patients", "list"]
     */
    lists: () => [domain, resource, "list"] as const,

    /**
     * Key for a specific list query with parameters
     * @example ["ehr", "patients", "list", { page: 1, limit: 10 }]
     */
    list: (params?: unknown) => [domain, resource, "list", params] as const,

    /**
     * Key for all detail queries (without ID)
     * @example ["ehr", "patients", "detail"]
     */
    details: () => [domain, resource, "detail"] as const,

    /**
     * Key for a specific detail query by ID
     * @example ["ehr", "patients", "detail", "123"]
     */
    detail: (id: string) => [domain, resource, "detail", id] as const,

    /**
     * Key for custom queries within this domain/resource
     * @example ["ehr", "patients", "search", { query: "john" }]
     */
    custom: (operation: string, params?: unknown) =>
      [domain, resource, operation, params] as const,
  };
}

/**
 * Type helper to extract the query key factory type
 */
export type QueryKeyFactory<T extends string = string> = ReturnType<
  typeof createQueryKeyFactory<T>
>;

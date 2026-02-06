/**
 * URL Query Parameter Builder
 *
 * Eliminates 8+ identical URLSearchParams implementations across API hooks.
 * Provides consistent parameter encoding with null/undefined filtering.
 *
 * @example
 * ```typescript
 * // Before: 8-10 lines
 * const params = new URLSearchParams();
 * if (page !== undefined) params.set("page", String(page));
 * if (limit !== undefined) params.set("limit", String(limit));
 * if (search) params.set("search", search);
 * const queryString = params.toString() ? `?${params}` : "";
 *
 * // After: 1 line
 * const queryString = buildQueryParams({ page, limit, search });
 * ```
 */

/**
 * Supported parameter value types
 */
export type QueryParamValue = string | number | boolean | undefined | null;

/**
 * Query parameters object
 */
export type QueryParams = Record<string, QueryParamValue>;

/**
 * Builds a URL query string from an object of parameters.
 * Automatically filters out undefined/null values and converts all values to strings.
 *
 * @param params - Object containing query parameters
 * @returns Query string with leading "?" or empty string if no params
 */
export function buildQueryParams(params?: QueryParams): string {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    // Skip undefined and null values
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * Builds query parameters and appends them to a base URL.
 *
 * @param baseUrl - The base URL (without query string)
 * @param params - Object containing query parameters
 * @returns Complete URL with query string
 *
 * @example
 * ```typescript
 * const url = buildUrlWithParams("/api/patients", { page: 1, limit: 10 });
 * // Returns: "/api/patients?page=1&limit=10"
 * ```
 */
export function buildUrlWithParams(baseUrl: string, params?: QueryParams): string {
  const queryString = buildQueryParams(params);
  return `${baseUrl}${queryString}`;
}

/**
 * Parses a query string into an object.
 * Useful for extracting parameters from URLs or location.search.
 *
 * @param queryString - Query string (with or without leading "?")
 * @returns Object containing parsed parameters
 *
 * @example
 * ```typescript
 * const params = parseQueryParams("?page=1&limit=10");
 * // Returns: { page: "1", limit: "10" }
 * ```
 */
export function parseQueryParams(queryString: string): Record<string, string> {
  // Remove leading "?" if present
  const cleanQuery = queryString.startsWith("?")
    ? queryString.slice(1)
    : queryString;

  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(cleanQuery);

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Merges multiple query parameter objects, with later objects overriding earlier ones.
 *
 * @param paramObjects - Query parameter objects to merge
 * @returns Merged query parameters
 *
 * @example
 * ```typescript
 * const merged = mergeQueryParams(
 *   { page: 1, limit: 10 },
 *   { page: 2 }
 * );
 * // Returns: { page: 2, limit: 10 }
 * ```
 */
export function mergeQueryParams(...paramObjects: (QueryParams | undefined)[]): QueryParams {
  return paramObjects.reduce<QueryParams>((acc, params) => {
    if (!params) return acc;
    return { ...acc, ...params };
  }, {});
}

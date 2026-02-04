/**
 * API Response Handler Utilities
 *
 * Eliminates 140+ identical error handling blocks across 50+ API hooks.
 * Provides consistent error handling for ApiResponse<T> patterns.
 */

import type { ApiResponse } from "../api/types";

/**
 * Unwraps an ApiResponse, throwing errors if the response contains an error or no data.
 *
 * @example
 * ```typescript
 * // Before: 3 lines per queryFn
 * if (response.error) throw new Error(response.error.message);
 * if (!response.data) throw new Error("No data returned");
 * return response.data;
 *
 * // After: 1 line
 * return unwrapApiResponse(response);
 * ```
 *
 * @param response - The API response to unwrap
 * @param errorMessage - Custom error message when data is missing (default: "No data returned from API")
 * @returns The unwrapped data
 * @throws Error if response contains an error or no data
 */
export function unwrapApiResponse<T>(
  response: ApiResponse<T>,
  errorMessage = "No data returned from API"
): T {
  // Check for explicit error in response
  if (response.error) {
    throw new Error(response.error.message);
  }

  // Check for missing data
  if (!response.data) {
    throw new Error(errorMessage);
  }

  return response.data;
}

/**
 * Unwraps an ApiResponse that may contain null data (for delete operations, etc.)
 *
 * @example
 * ```typescript
 * // For operations that return null/undefined on success
 * return unwrapApiResponseNullable(response);
 * ```
 *
 * @param response - The API response to unwrap
 * @returns The unwrapped data (may be null/undefined)
 * @throws Error if response contains an error
 */
export function unwrapApiResponseNullable<T>(
  response: ApiResponse<T>
): T | null | undefined {
  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

/**
 * Checks if an API response is successful (no error, has data)
 *
 * @param response - The API response to check
 * @returns True if response is successful
 */
export function isApiResponseSuccess<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { data: T } {
  return !response.error && response.data !== null && response.data !== undefined;
}

/**
 * Gets error message from ApiResponse or returns default
 *
 * @param response - The API response
 * @param defaultMessage - Default message if no error present
 * @returns Error message or default
 */
export function getApiErrorMessage<T>(
  response: ApiResponse<T>,
  defaultMessage = "An unknown error occurred"
): string {
  return response.error?.message || defaultMessage;
}

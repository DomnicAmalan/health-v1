/**
 * API Request/Response Type Schemas
 *
 * Generic schemas for API interactions, error handling, and response wrapping.
 */

import { z } from "zod";
import { createTypeGuard } from "../guards";

// ============================================================================
// API Response Schemas
// ============================================================================

/**
 * Generic API error schema
 */
export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  status: z.number().int().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Success response wrapper
 */
export const SuccessResponseSchema = z.object({
  status: z.literal('success'),
  data: z.unknown(),
});

/**
 * Error response wrapper
 */
export const ErrorResponseSchema = z.object({
  status: z.literal('error'),
  error: ApiErrorSchema,
});

/**
 * Discriminated union for API responses
 */
export const ApiResponseSchema = z.discriminatedUnion('status', [
  SuccessResponseSchema,
  ErrorResponseSchema,
]);

export type ApiResponse<T = unknown> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

// Type guards
export const isSuccessResponse = createTypeGuard(SuccessResponseSchema);
export const isErrorResponse = createTypeGuard(ErrorResponseSchema);
export const isApiError = createTypeGuard(ApiErrorSchema);

// ============================================================================
// Pagination Schemas (API-specific)
// ============================================================================

/**
 * Paginated API response
 */
export function createPaginatedApiResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T
) {
  return z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  });
}

// ============================================================================
// Request Configuration Schema
// ============================================================================

/**
 * API request configuration with validation support
 */
export const RequestConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  validateRequest: z.any().optional(), // ZodType
  validateResponse: z.any().optional(), // ZodType
  throwOnValidationError: z.boolean().optional(),
  timeout: z.number().int().positive().optional(),
  signal: z.any().optional(), // AbortSignal
});

export type RequestConfig = z.infer<typeof RequestConfigSchema>;

// ============================================================================
// Common API Response Types
// ============================================================================

/**
 * Simple success message response
 */
export const SuccessMessageSchema = z.object({
  message: z.string(),
  success: z.boolean().default(true),
});

export type SuccessMessage = z.infer<typeof SuccessMessageSchema>;

/**
 * ID response (for create operations)
 */
export const IdResponseSchema = z.object({
  id: z.string(),
});

export type IdResponse = z.infer<typeof IdResponseSchema>;

/**
 * Count response (for list operations)
 */
export const CountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

export type CountResponse = z.infer<typeof CountResponseSchema>;

// Type guards
export const isSuccessMessage = createTypeGuard(SuccessMessageSchema);
export const isIdResponse = createTypeGuard(IdResponseSchema);
export const isCountResponse = createTypeGuard(CountResponseSchema);

// ============================================================================
// HTTP Status Code Helpers
// ============================================================================

/**
 * HTTP status code schema
 */
export const HttpStatusSchema = z.number().int().min(100).max(599);

/**
 * Success status codes (2xx)
 */
export const SuccessStatusSchema = z.number().int().min(200).max(299);

/**
 * Client error status codes (4xx)
 */
export const ClientErrorStatusSchema = z.number().int().min(400).max(499);

/**
 * Server error status codes (5xx)
 */
export const ServerErrorStatusSchema = z.number().int().min(500).max(599);

/**
 * Check if status code is successful
 */
export function isSuccessStatus(status: number): boolean {
  return SuccessStatusSchema.safeParse(status).success;
}

/**
 * Check if status code is client error
 */
export function isClientError(status: number): boolean {
  return ClientErrorStatusSchema.safeParse(status).success;
}

/**
 * Check if status code is server error
 */
export function isServerError(status: number): boolean {
  return ServerErrorStatusSchema.safeParse(status).success;
}

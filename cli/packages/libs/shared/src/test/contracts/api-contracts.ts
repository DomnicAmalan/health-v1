/**
 * API Contract Testing Utilities
 *
 * Provides Zod schemas for validating API responses match expected contracts.
 * Ensures frontend and backend stay in sync.
 *
 * Usage:
 *   const patient = await validateApiContract(response, PatientResponseSchema);
 */

import { z } from 'zod';

// Re-use existing schemas from main codebase
import { UserSchema } from '../../schemas/user';
import { EhrPatientSchema } from '../../schemas/ehr/patient';
import { EhrAppointmentSchema } from '../../schemas/ehr/appointment';
import { EhrMedicationSchema } from '../../schemas/ehr/medication';
import { EhrProblemSchema } from '../../schemas/ehr/problem';
import { EhrVitalSignsSchema } from '../../schemas/ehr/vital';

// ============================================================================
// Response Wrapper Schemas
// ============================================================================

/**
 * Standard API response wrapper
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.nullable(),
    error: z.string().nullable(),
    status: z.number().optional(),
  });

/**
 * Paginated API response wrapper
 */
export const PaginatedApiResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.object({
      items: z.array(itemSchema),
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      hasMore: z.boolean(),
    }).nullable(),
    error: z.string().nullable(),
    status: z.number().optional(),
  });

// ============================================================================
// Entity Response Schemas
// ============================================================================

/**
 * User response schema
 */
export const UserResponseSchema = ApiResponseSchema(UserSchema);
export type UserResponse = z.infer<typeof UserResponseSchema>;

/**
 * Patient response schema
 */
export const PatientResponseSchema = ApiResponseSchema(EhrPatientSchema);
export type PatientResponse = z.infer<typeof PatientResponseSchema>;

/**
 * Appointment response schema
 */
export const AppointmentResponseSchema = ApiResponseSchema(EhrAppointmentSchema);
export type AppointmentResponse = z.infer<typeof AppointmentResponseSchema>;

/**
 * Medication response schema
 */
export const MedicationResponseSchema = ApiResponseSchema(EhrMedicationSchema);
export type MedicationResponse = z.infer<typeof MedicationResponseSchema>;

/**
 * Problem response schema
 */
export const ProblemResponseSchema = ApiResponseSchema(EhrProblemSchema);
export type ProblemResponse = z.infer<typeof ProblemResponseSchema>;

/**
 * Vital signs response schema
 */
export const VitalSignsResponseSchema = ApiResponseSchema(EhrVitalSignsSchema);
export type VitalSignsResponse = z.infer<typeof VitalSignsResponseSchema>;

// ============================================================================
// List Response Schemas
// ============================================================================

/**
 * Paginated users response
 */
export const UserListResponseSchema = PaginatedApiResponseSchema(UserSchema);
export type UserListResponse = z.infer<typeof UserListResponseSchema>;

/**
 * Paginated patients response
 */
export const PatientListResponseSchema = PaginatedApiResponseSchema(EhrPatientSchema);
export type PatientListResponse = z.infer<typeof PatientListResponseSchema>;

/**
 * Paginated appointments response
 */
export const AppointmentListResponseSchema = PaginatedApiResponseSchema(EhrAppointmentSchema);
export type AppointmentListResponse = z.infer<typeof AppointmentListResponseSchema>;

// ============================================================================
// Auth Response Schemas
// ============================================================================

/**
 * Login response schema
 */
export const LoginResponseSchema = ApiResponseSchema(
  z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number().int().positive(),
    tokenType: z.string().default('Bearer'),
    user: UserSchema,
  })
);
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * Refresh token response schema
 */
export const RefreshTokenResponseSchema = ApiResponseSchema(
  z.object({
    accessToken: z.string(),
    expiresIn: z.number().int().positive(),
  })
);
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate API response against contract schema
 *
 * @param response - API response object
 * @param schema - Zod schema to validate against
 * @returns Validated and typed response data
 * @throws Error if validation fails
 *
 * @example
 * ```ts
 * const response = await fetch('/api/v1/patients/123');
 * const json = await response.json();
 * const patient = await validateApiContract(json, PatientResponseSchema);
 * ```
 */
export async function validateApiContract<T>(
  response: unknown,
  schema: z.ZodSchema<T>
): Promise<T> {
  const result = schema.safeParse(response);

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    throw new Error(
      `API Contract Validation Failed:\n${JSON.stringify(errors, null, 2)}`
    );
  }

  return result.data;
}

/**
 * Validate API response synchronously
 *
 * @param response - API response object
 * @param schema - Zod schema to validate against
 * @returns Validated and typed response data
 * @throws Error if validation fails
 *
 * @example
 * ```ts
 * const patient = validateApiContractSync(responseData, PatientResponseSchema);
 * ```
 */
export function validateApiContractSync<T>(
  response: unknown,
  schema: z.ZodSchema<T>
): T {
  const result = schema.safeParse(response);

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    throw new Error(
      `API Contract Validation Failed:\n${JSON.stringify(errors, null, 2)}`
    );
  }

  return result.data;
}

/**
 * Check if response matches contract (returns boolean)
 *
 * @param response - API response object
 * @param schema - Zod schema to validate against
 * @returns true if valid, false otherwise
 *
 * @example
 * ```ts
 * if (isValidApiContract(responseData, PatientResponseSchema)) {
 *   // Response is valid
 * }
 * ```
 */
export function isValidApiContract<T>(
  response: unknown,
  schema: z.ZodSchema<T>
): boolean {
  return schema.safeParse(response).success;
}

/**
 * Get contract validation errors
 *
 * @param response - API response object
 * @param schema - Zod schema to validate against
 * @returns Array of validation errors, or null if valid
 *
 * @example
 * ```ts
 * const errors = getContractErrors(responseData, PatientResponseSchema);
 * if (errors) {
 *   console.error('Validation errors:', errors);
 * }
 * ```
 */
export function getContractErrors<T>(
  response: unknown,
  schema: z.ZodSchema<T>
): Array<{ path: string; message: string; code: string }> | null {
  const result = schema.safeParse(response);

  if (result.success) {
    return null;
  }

  return result.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Create a contract validator function
 *
 * @param schema - Zod schema to validate against
 * @returns Validator function
 *
 * @example
 * ```ts
 * const validatePatient = createContractValidator(PatientResponseSchema);
 * const patient = validatePatient(responseData);
 * ```
 */
export function createContractValidator<T>(schema: z.ZodSchema<T>) {
  return (response: unknown): T => validateApiContractSync(response, schema);
}

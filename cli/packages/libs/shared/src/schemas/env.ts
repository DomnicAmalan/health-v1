/**
 * Environment Variable Validation with Zod
 *
 * Validates environment variables at runtime to catch configuration errors early.
 * Replaces custom env validator with type-safe Zod schemas.
 */

import { z } from "zod";
import { formatZodError } from "./guards";

// ============================================================================
// Environment Schemas
// ============================================================================

/**
 * Vite environment variables schema (runtime validation)
 */
export const ViteEnvSchema = z.object({
  // API Configuration
  VITE_API_BASE_URL: z
    .string()
    .url({ message: "VITE_API_BASE_URL must be a valid URL" })
    .default('http://localhost:8080'),

  // Authentication
  VITE_AUTH_TOKEN_KEY: z.string().default('auth_token'),
  VITE_AUTH_REFRESH_KEY: z.string().default('refresh_token'),

  // Feature Flags
  VITE_ENABLE_AUDIT_LOGGING: z
    .enum(['true', 'false'])
    .default('true')
    .transform(val => val === 'true'),

  VITE_ENABLE_PHI_MASKING: z
    .enum(['true', 'false'])
    .default('true')
    .transform(val => val === 'true'),

  VITE_ENABLE_DEBUG: z
    .enum(['true', 'false'])
    .default('false')
    .transform(val => val === 'true'),

  // Session Configuration
  VITE_SESSION_TIMEOUT_MS: z
    .string()
    .regex(/^\d+$/, { message: "VITE_SESSION_TIMEOUT_MS must be a number" })
    .default('900000') // 15 minutes
    .transform(val => parseInt(val, 10)),

  // Environment
  MODE: z.enum(['development', 'production', 'test']).default('development'),
  DEV: z.boolean().default(true),
  PROD: z.boolean().default(false),
});

export type ViteEnv = z.infer<typeof ViteEnvSchema>;

/**
 * Vault UI specific environment schema
 */
export const VaultEnvSchema = ViteEnvSchema.extend({
  // Vault API is on different port (4117)
  VITE_API_BASE_URL: z
    .string()
    .url()
    .refine(
      url => url.includes(':4117'),
      { message: "Vault UI must connect to port 4117" }
    ),
});

export type VaultEnv = z.infer<typeof VaultEnvSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate Vite environment variables
 *
 * @param env - import.meta.env object
 * @returns Validated and typed environment object
 * @throws Error if validation fails
 *
 * @example
 * ```typescript
 * // In app entry point
 * const env = validateViteEnv(import.meta.env);
 * console.log(env.VITE_API_BASE_URL); // Type-safe, validated
 * ```
 */
export function validateViteEnv(env: Record<string, unknown>): ViteEnv {
  const result = ViteEnvSchema.safeParse(env);

  if (!result.success) {
    const errors = formatZodError(result.error);
    console.error('❌ Environment validation failed:');
    console.error(errors);
    throw new Error(`Invalid environment configuration: ${errors}`);
  }

  // Log validation success in development
  if (result.data.DEV) {
    console.log('✅ Environment variables validated successfully');
    console.log('📍 API Base URL:', result.data.VITE_API_BASE_URL);
    console.log('🔒 Audit Logging:', result.data.VITE_ENABLE_AUDIT_LOGGING ? 'enabled' : 'disabled');
    console.log('🎭 PHI Masking:', result.data.VITE_ENABLE_PHI_MASKING ? 'enabled' : 'disabled');
  }

  return result.data;
}

/**
 * Validate Vault UI environment variables
 */
export function validateVaultEnv(env: Record<string, unknown>): VaultEnv {
  const result = VaultEnvSchema.safeParse(env);

  if (!result.success) {
    const errors = formatZodError(result.error);
    console.error('❌ Vault environment validation failed:');
    console.error(errors);
    throw new Error(`Invalid vault environment configuration: ${errors}`);
  }

  if (result.data.DEV) {
    console.log('✅ Vault environment variables validated successfully');
    console.log('📍 Vault API URL:', result.data.VITE_API_BASE_URL);
  }

  return result.data;
}

/**
 * Get validated environment variable
 *
 * @param key - Environment variable key
 * @param schema - Zod schema to validate against
 * @returns Validated value
 * @throws Error if validation fails
 *
 * @example
 * ```typescript
 * const apiUrl = getEnvVar('VITE_API_BASE_URL', z.string().url());
 * ```
 */
export function getEnvVar<T>(
  key: string,
  schema: z.ZodType<T>,
  defaultValue?: T
): T {
  const value = import.meta.env[key] ?? defaultValue;

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  const result = schema.safeParse(value);

  if (!result.success) {
    throw new Error(
      `Invalid environment variable ${key}: ${formatZodError(result.error)}`
    );
  }

  return result.data;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV === true || import.meta.env.MODE === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true || import.meta.env.MODE === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return import.meta.env.MODE === 'test';
}

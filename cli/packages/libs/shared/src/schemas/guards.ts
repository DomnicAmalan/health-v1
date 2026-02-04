/**
 * Type Guard Utilities for Zod Schema Validation
 *
 * Provides utilities for creating type guards, assertions, and error formatting
 * that bridge TypeScript compile-time types with runtime validation.
 */

import { type z } from "zod";

/**
 * Format Zod validation errors into human-readable messages
 * @param error - ZodError from failed validation
 * @returns Formatted error message string
 */
export function formatZodError(error: z.ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });

  return issues.join('; ');
}

/**
 * Create a type assertion function from a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param typeName - Name of the type (for error messages)
 * @returns Assertion function that throws on validation failure
 *
 * @example
 * ```typescript
 * const assertUser = createAssertion(UserSchema, 'User');
 *
 * const data = await fetchUser();
 * assertUser(data); // Throws if invalid
 * // From here on, data is validated User type
 * console.log(data.email); // Type-safe
 * ```
 */
export function createAssertion<T>(
  schema: z.ZodType<T>,
  typeName: string
): (value: unknown) => asserts value is T {
  return (value: unknown): asserts value is T => {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new Error(
        `Expected ${typeName}, validation failed: ${formatZodError(result.error)}`
      );
    }
  };
}

/**
 * Create a type guard function from a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Type guard function that narrows type
 *
 * @example
 * ```typescript
 * const isUser = createTypeGuard(UserSchema);
 *
 * if (isUser(data)) {
 *   // TypeScript knows data is User here
 *   console.log(data.email); // Type-safe
 * }
 * ```
 */
export function createTypeGuard<T>(
  schema: z.ZodType<T>
): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    return schema.safeParse(value).success;
  };
}

/**
 * Parse with fallback - returns parsed data or default value
 *
 * @param schema - Zod schema to validate against
 * @param value - Value to parse
 * @param fallback - Default value if parsing fails
 * @returns Parsed data or fallback
 *
 * @example
 * ```typescript
 * const user = parseWithFallback(UserSchema, data, null);
 * if (user) {
 *   // Use validated user
 * }
 * ```
 */
export function parseWithFallback<T>(
  schema: z.ZodType<T>,
  value: unknown,
  fallback: T
): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

/**
 * Validate array of items, filtering out invalid ones
 *
 * @param schema - Zod schema for array items
 * @param items - Array to validate
 * @param options - Validation options
 * @returns Filtered array of valid items
 *
 * @example
 * ```typescript
 * const validUsers = validateArray(UserSchema, rawData, {
 *   onError: (err, item) => console.warn('Invalid user:', err)
 * });
 * ```
 */
export function validateArray<T>(
  schema: z.ZodType<T>,
  items: unknown[],
  options?: {
    onError?: (error: z.ZodError, item: unknown, index: number) => void;
    strict?: boolean; // If true, throw on first error
  }
): T[] {
  const validated: T[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = schema.safeParse(item);

    if (result.success) {
      validated.push(result.data);
    } else {
      if (options?.onError) {
        options.onError(result.error, item, i);
      }
      if (options?.strict) {
        throw new Error(
          `Array validation failed at index ${i}: ${formatZodError(result.error)}`
        );
      }
    }
  }

  return validated;
}

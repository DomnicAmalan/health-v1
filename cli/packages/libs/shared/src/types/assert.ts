/**
 * Type Assertion Utilities
 * Custom type guards and assertion functions for runtime validation
 */

// =============================================================================
// Basic Type Guards
// =============================================================================

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Check if value is a number (excludes NaN)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Check if value exists (not null or undefined)
 */
export function exists<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is null or undefined (optional)
 */
export function isOptional(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is an object (excludes null and arrays)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is a valid UUID string
 */
export function isUUID(value: unknown): value is string {
  if (!isString(value)) {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if value is a valid email string
 */
export function isEmail(value: unknown): value is string {
  if (!isString(value)) {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if value is a valid ISO date string
 */
export function isDateString(value: unknown): value is string {
  if (!isString(value)) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

/**
 * Check if value is one of the allowed values
 */
export function isOneOf<T extends readonly unknown[]>(
  value: unknown,
  allowedValues: T
): value is T[number] {
  return allowedValues.includes(value);
}

/**
 * Check if value is a Record<string, unknown>
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}

/**
 * Check if array contains items of specific type
 */
export function isArrayOf<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is T[] {
  return isArray(value) && value.every(itemGuard);
}

// =============================================================================
// Assertion Error
// =============================================================================

export class AssertionError extends Error {
  constructor(
    public readonly path: string,
    public readonly expected: string,
    public readonly received: unknown
  ) {
    const receivedType = received === null ? "null" : typeof received;
    super(`Assertion failed at '${path}': expected ${expected}, got ${receivedType}`);
    this.name = "AssertionError";
  }
}

// =============================================================================
// Assertion Functions (throw on failure)
// =============================================================================

/**
 * Assert value is a string, return typed value
 */
export function assertString(value: unknown, path = "value"): string {
  if (!isString(value)) {
    throw new AssertionError(path, "string", value);
  }
  return value;
}

/**
 * Assert value is a number, return typed value
 */
export function assertNumber(value: unknown, path = "value"): number {
  if (!isNumber(value)) {
    throw new AssertionError(path, "number", value);
  }
  return value;
}

/**
 * Assert value is a boolean, return typed value
 */
export function assertBoolean(value: unknown, path = "value"): boolean {
  if (!isBoolean(value)) {
    throw new AssertionError(path, "boolean", value);
  }
  return value;
}

/**
 * Assert value exists (not null or undefined), return typed value
 */
export function assertExists<T>(value: T | null | undefined, path = "value"): T {
  if (!exists(value)) {
    throw new AssertionError(path, "defined value", value);
  }
  return value;
}

/**
 * Assert value is an object, return typed value
 */
export function assertObject(value: unknown, path = "value"): Record<string, unknown> {
  if (!isObject(value)) {
    throw new AssertionError(path, "object", value);
  }
  return value;
}

/**
 * Assert value is an array, return typed value
 */
export function assertArray(value: unknown, path = "value"): unknown[] {
  if (!isArray(value)) {
    throw new AssertionError(path, "array", value);
  }
  return value;
}

/**
 * Assert value is a UUID, return typed value
 */
export function assertUUID(value: unknown, path = "value"): string {
  if (!isUUID(value)) {
    throw new AssertionError(path, "UUID", value);
  }
  return value;
}

/**
 * Assert value is one of allowed values, return typed value
 */
export function assertOneOf<T extends readonly unknown[]>(
  value: unknown,
  allowedValues: T,
  path = "value"
): T[number] {
  if (!isOneOf(value, allowedValues)) {
    throw new AssertionError(path, `one of [${allowedValues.join(", ")}]`, value);
  }
  return value as T[number];
}

/**
 * Assert array of specific type, return typed array
 */
export function assertArrayOf<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T,
  path = "value"
): T[] {
  if (!isArrayOf(value, itemGuard)) {
    throw new AssertionError(path, "array of expected type", value);
  }
  return value;
}

// =============================================================================
// Optional Wrapper
// =============================================================================

/**
 * Check optional value - returns true if undefined/null OR if guard passes
 */
export function isOptionalOf<T>(
  value: unknown,
  guard: (v: unknown) => v is T
): value is T | undefined {
  return isOptional(value) || guard(value);
}

/**
 * Assert optional value - returns undefined if null/undefined, otherwise asserts
 */
export function assertOptional<T>(
  value: unknown,
  assertFn: (v: unknown, path: string) => T,
  path = "value"
): T | undefined {
  if (isOptional(value)) {
    return undefined;
  }
  return assertFn(value, path);
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Infer type from a type guard function
 */
export type InferGuard<T> = T extends (value: unknown) => value is infer U ? U : never;

/**
 * Infer type from an assertion function
 */
export type InferAssert<T> = T extends (value: unknown, path?: string) => infer U ? U : never;

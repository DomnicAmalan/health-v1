/**
 * Validation Middleware for Zustand
 * Validates data before state updates to ensure data integrity
 */

import type { StateCreator } from "zustand";

/**
 * Store validation error structure
 */
export interface StoreValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Field validation rule
 */
export interface FieldValidationRule {
  /** Field name */
  name: string;
  /** Field type */
  type?: "string" | "number" | "boolean" | "date" | "timestamp" | "object" | "array";
  /** Whether field is required */
  required?: boolean;
  /** Whether field is immutable */
  immutable?: boolean;
  /** Minimum value (for numbers) or length (for strings/arrays) */
  min?: number;
  /** Maximum value (for numbers) or length (for strings/arrays) */
  max?: number;
  /** Pattern to match (for strings) */
  pattern?: RegExp;
  /** Custom validator function */
  validator?: (value: unknown) => boolean | string;
}

/**
 * Configuration for validation middleware
 */
export interface ValidationMiddlewareConfig {
  /** Field validation rules */
  rules: FieldValidationRule[];
  /** Callback when validation fails */
  onValidationError?: (errors: StoreValidationError[]) => void;
  /** Whether to throw error on validation failure (default: false) */
  throwOnError?: boolean;
  /** Whether to enable validation (default: true) */
  enabled?: boolean;
}

/**
 * Validate a field value against its rule
 */
function validateField(rule: FieldValidationRule, value: unknown): StoreValidationError | null {
  // Check required
  if (rule.required && (value === undefined || value === null || value === "")) {
    return { field: rule.name, message: "Field is required", value };
  }

  // Skip further validation if value is not provided and not required
  if (value === undefined || value === null) {
    return null;
  }

  // Type validation
  if (rule.type) {
    switch (rule.type) {
      case "string":
        if (typeof value !== "string") {
          return { field: rule.name, message: `Expected string, got ${typeof value}`, value };
        }
        // String length validation
        if (rule.min !== undefined && value.length < rule.min) {
          return {
            field: rule.name,
            message: `String length must be at least ${rule.min}`,
            value,
          };
        }
        if (rule.max !== undefined && value.length > rule.max) {
          return {
            field: rule.name,
            message: `String length must be at most ${rule.max}`,
            value,
          };
        }
        // Pattern validation
        if (rule.pattern && !rule.pattern.test(value)) {
          return { field: rule.name, message: "Pattern does not match", value };
        }
        break;

      case "number":
        if (typeof value !== "number" || Number.isNaN(value)) {
          return { field: rule.name, message: `Expected number, got ${typeof value}`, value };
        }
        if (rule.min !== undefined && value < rule.min) {
          return { field: rule.name, message: `Value must be at least ${rule.min}`, value };
        }
        if (rule.max !== undefined && value > rule.max) {
          return { field: rule.name, message: `Value must be at most ${rule.max}`, value };
        }
        break;

      case "boolean":
        if (typeof value !== "boolean") {
          return { field: rule.name, message: `Expected boolean, got ${typeof value}`, value };
        }
        break;

      case "date":
        if (!(value instanceof Date) && typeof value !== "string") {
          return { field: rule.name, message: `Expected date, got ${typeof value}`, value };
        }
        if (typeof value === "string") {
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) {
            return { field: rule.name, message: "Invalid date format", value };
          }
        }
        break;

      case "timestamp":
        if (
          typeof value !== "string" &&
          typeof value !== "number" &&
          !(value instanceof Date)
        ) {
          return { field: rule.name, message: `Expected timestamp, got ${typeof value}`, value };
        }
        break;

      case "object":
        if (typeof value !== "object" || Array.isArray(value)) {
          return { field: rule.name, message: `Expected object, got ${typeof value}`, value };
        }
        break;

      case "array":
        if (!Array.isArray(value)) {
          return { field: rule.name, message: "Expected array", value };
        }
        if (rule.min !== undefined && value.length < rule.min) {
          return {
            field: rule.name,
            message: `Array length must be at least ${rule.min}`,
            value,
          };
        }
        if (rule.max !== undefined && value.length > rule.max) {
          return {
            field: rule.name,
            message: `Array length must be at most ${rule.max}`,
            value,
          };
        }
        break;
    }
  }

  // Custom validator
  if (rule.validator) {
    const result = rule.validator(value);
    if (typeof result === "string") {
      return { field: rule.name, message: result, value };
    }
    if (result === false) {
      return { field: rule.name, message: "Custom validation failed", value };
    }
  }

  return null;
}

/**
 * Validate an object against rules
 */
function validateObject(obj: unknown, rules: FieldValidationRule[]): StoreValidationError[] {
  const errors: StoreValidationError[] = [];

  if (!obj || typeof obj !== "object") {
    return errors;
  }

  for (const rule of rules) {
    const value = (obj as Record<string, unknown>)[rule.name];
    const error = validateField(rule, value);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

/**
 * Create validation middleware for Zustand stores
 *
 * @example
 * ```typescript
 * import { create } from 'zustand';
 * import { createValidationMiddleware } from '@lazarus-life/shared/middleware';
 *
 * const validationMiddleware = createValidationMiddleware({
 *   rules: [
 *     { name: 'email', type: 'string', required: true, pattern: /^.+@.+\..+$/ },
 *     { name: 'age', type: 'number', min: 0, max: 150 },
 *   ],
 *   onValidationError: (errors) => console.error('Validation failed:', errors),
 *   throwOnError: true,
 * });
 *
 * const useUserStore = create(
 *   validationMiddleware(
 *     (set) => ({
 *       user: null,
 *       setUser: (user) => set({ user }),
 *     })
 *   )
 * );
 * ```
 */
export function createValidationMiddleware(config: ValidationMiddlewareConfig) {
  const { rules, onValidationError, throwOnError = false, enabled = true } = config;

  return function validationMiddleware<T>(stateCreator: StateCreator<T>): StateCreator<T> {
    return (set, get, api) => {
      if (!enabled) {
        return stateCreator(set, get, api);
      }

      // Wrap set function to validate changes
      const setWithValidation = (
        partial: T | Partial<T> | ((state: T) => T | Partial<T>),
        replace?: boolean
      ) => {
        let dataToValidate: unknown = partial;

        // If partial is a function, execute it first to get the actual data
        if (typeof partial === "function" && partial.prototype === undefined) {
          const currentState = get();
          dataToValidate = (partial as (state: T) => T | Partial<T>)(currentState);
        }

        // Validate the data
        if (typeof dataToValidate === "object" && dataToValidate !== null) {
          const errors = validateObject(dataToValidate, rules);

          if (errors.length > 0) {
            // Call error callback if provided
            if (onValidationError) {
              try {
                onValidationError(errors);
              } catch (error) {
                console.error("[ValidationMiddleware] Error in onValidationError callback:", error);
              }
            }

            // Throw error if configured
            if (throwOnError) {
              const errorMessage = errors.map((e) => `${e.field}: ${e.message}`).join(", ");
              throw new Error(`Validation failed: ${errorMessage}`);
            }
          }
        }

        // Call original set
        if (replace === true) {
          if (typeof partial === "function") {
            const currentState = get();
            const fullState = partial(currentState);
            return set(fullState as T, true);
          }
          return set(partial as T, true);
        }
        return set(partial, false);
      };

      return stateCreator(setWithValidation, get, api);
    };
  };
}

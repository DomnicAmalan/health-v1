/**
 * Common Zod Schemas - Shared Primitives
 *
 * Reusable schema primitives used across the application.
 * Includes validated types for UUIDs, emails, phone numbers, dates, etc.
 */

import { z } from "zod";

// ============================================================================
// Branded Primitives (Validated String Types)
// ============================================================================

/**
 * UUID v4 format validation
 * Brand ensures only validated UUIDs are used
 */
export const UuidSchema = z
  .string()
  .uuid()
  .brand('Uuid');

export type Uuid = z.infer<typeof UuidSchema>;

/**
 * Email address validation (RFC 5322)
 */
export const EmailSchema = z
  .string()
  .email()
  .brand('Email');

export type Email = z.infer<typeof EmailSchema>;

/**
 * Phone number validation (10-digit US format)
 * Accepts: 1234567890, 123-456-7890, (123) 456-7890
 */
export const PhoneNumberSchema = z
  .string()
  .regex(/^\d{10}$|^\d{3}-\d{3}-\d{4}$|^\(\d{3}\)\s?\d{3}-\d{4}$/, {
    message: "Invalid phone number format (expected 10 digits)"
  })
  .transform(val => val.replace(/\D/g, '')) // Normalize to digits only
  .brand('PhoneNumber');

export type PhoneNumber = z.infer<typeof PhoneNumberSchema>;

/**
 * SSN validation (PHI - HIPAA protected)
 * Format: XXX-XX-XXXX
 */
export const SSNSchema = z
  .string()
  .regex(/^\d{3}-\d{2}-\d{4}$/, {
    message: "Invalid SSN format (expected XXX-XX-XXXX)"
  })
  .brand('SSN');

export type SSN = z.infer<typeof SSNSchema>;

/**
 * Medical Record Number (MRN) validation
 * Typically 7-10 alphanumeric characters
 */
export const MRNSchema = z
  .string()
  .regex(/^[A-Z0-9]{7,10}$/, {
    message: "Invalid MRN format (expected 7-10 alphanumeric characters)"
  })
  .brand('MRN');

export type MRN = z.infer<typeof MRNSchema>;

// ============================================================================
// Date/Time Schemas
// ============================================================================

/**
 * ISO 8601 date string (YYYY-MM-DD)
 */
export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Invalid date format (expected YYYY-MM-DD)"
  })
  .refine(
    val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: "Invalid date value" }
  );

/**
 * ISO 8601 datetime string with timezone
 */
export const DateTimeSchema = z
  .string()
  .datetime({ message: "Invalid datetime format (expected ISO 8601)" });

/**
 * Date object schema
 */
export const DateObjectSchema = z.coerce.date();

// ============================================================================
// Currency/Monetary Schemas
// ============================================================================

/**
 * Currency amount (non-negative, 2 decimal places)
 */
export const CurrencySchema = z
  .number()
  .nonnegative({ message: "Amount cannot be negative" })
  .multipleOf(0.01, { message: "Amount must have at most 2 decimal places" });

/**
 * Percentage (0-100)
 */
export const PercentageSchema = z
  .number()
  .min(0, { message: "Percentage cannot be negative" })
  .max(100, { message: "Percentage cannot exceed 100" });

/**
 * Tax rate (0-1, e.g., 0.0825 for 8.25%)
 */
export const TaxRateSchema = z
  .number()
  .min(0)
  .max(1);

// ============================================================================
// Text Schemas
// ============================================================================

/**
 * Non-empty trimmed string
 */
export const NonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, { message: "Value cannot be empty" });

/**
 * Name field (1-100 characters, letters and common punctuation)
 */
export const NameSchema = z
  .string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(100, { message: "Name cannot exceed 100 characters" })
  .regex(/^[a-zA-Z\s'-]+$/, {
    message: "Name can only contain letters, spaces, hyphens, and apostrophes"
  });

/**
 * URL validation
 */
export const UrlSchema = z
  .string()
  .url({ message: "Invalid URL format" });

// ============================================================================
// Address Schemas
// ============================================================================

/**
 * US ZIP code (5 digits or 5+4 format)
 */
export const ZipCodeSchema = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, {
    message: "Invalid ZIP code format (expected XXXXX or XXXXX-XXXX)"
  });

/**
 * US State code (2 letters)
 */
export const StateCodeSchema = z
  .string()
  .length(2, { message: "State code must be 2 characters" })
  .regex(/^[A-Z]{2}$/, { message: "State code must be uppercase letters" });

/**
 * Physical address schema
 */
export const AddressSchema = z.object({
  street1: NonEmptyStringSchema,
  street2: z.string().optional(),
  city: NonEmptyStringSchema,
  state: StateCodeSchema,
  zipCode: ZipCodeSchema,
  country: z.string().default('US'),
});

export type Address = z.infer<typeof AddressSchema>;

// ============================================================================
// Pagination Schemas
// ============================================================================

/**
 * Pagination parameters
 */
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * Paginated response wrapper
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });
}

// ============================================================================
// Utility Schemas
// ============================================================================

/**
 * Nullable schema helper
 */
export function nullable<T extends z.ZodTypeAny>(schema: T) {
  return schema.nullable();
}

/**
 * Optional schema helper
 */
export function optional<T extends z.ZodTypeAny>(schema: T) {
  return schema.optional();
}

/**
 * JSON value schema (for unknown JSON data)
 */
export const JsonValueSchema: z.ZodType<
  string | number | boolean | null | { [key: string]: unknown } | unknown[]
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.record(JsonValueSchema),
    z.array(JsonValueSchema),
  ])
);

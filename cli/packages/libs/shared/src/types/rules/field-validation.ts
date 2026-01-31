/**
 * Field Validation types
 * Dynamic field-level validation rules per region/organization
 */

/**
 * Field validation type
 */
export type FieldValidationType =
  | "required" // Field is required
  | "format" // Specific format required (regex)
  | "range" // Numeric/date range
  | "enum" // Must be from list of values
  | "reference" // Must reference valid record
  | "computed" // Auto-computed value
  | "conditional" // Required based on condition
  | "unique" // Must be unique
  | "immutable"; // Cannot be changed after creation

/**
 * Validation severity
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * Base validation config (common fields)
 */
interface BaseValidationConfig {
  /** Custom error message override */
  message?: string;
}

/**
 * Required validation config
 * Example: {"when": {"field": "status", "eq": "active"}}
 */
export interface RequiredValidationConfig extends BaseValidationConfig {
  /** Conditional requirement */
  when?: {
    field: string;
    eq?: unknown;
    neq?: unknown;
    in?: unknown[];
    notIn?: unknown[];
  };
}

/**
 * Format validation config
 * Example: {"pattern": "^[A-Z]{2}\\d{6}$", "message": "Invalid MRN format"}
 */
export interface FormatValidationConfig extends BaseValidationConfig {
  /** Regex pattern */
  pattern: string;
  /** Pattern flags (e.g., "i" for case-insensitive) */
  flags?: string;
}

/**
 * Range validation config
 * Example: {"min": 0, "max": 150, "unit": "years"}
 */
export interface RangeValidationConfig extends BaseValidationConfig {
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Unit for display */
  unit?: string;
  /** Whether min is exclusive */
  exclusiveMin?: boolean;
  /** Whether max is exclusive */
  exclusiveMax?: boolean;
}

/**
 * Enum validation config
 * Example: {"values": ["active", "inactive", "deceased"]}
 */
export interface EnumValidationConfig extends BaseValidationConfig {
  /** Allowed values */
  values: (string | number)[];
  /** Value labels for display */
  labels?: Record<string, string>;
}

/**
 * Reference validation config
 * Example: {"entity": "Patient", "field": "id"}
 */
export interface ReferenceValidationConfig extends BaseValidationConfig {
  /** Entity to reference */
  entity: string;
  /** Field on the entity */
  field: string;
  /** Additional filter */
  filter?: Record<string, unknown>;
}

/**
 * Computed validation config
 * Example: {"formula": "quantity * unitPrice", "dependencies": ["quantity", "unitPrice"]}
 */
export interface ComputedValidationConfig extends BaseValidationConfig {
  /** Computation formula/expression */
  formula: string;
  /** Fields this computation depends on */
  dependencies: string[];
}

/**
 * Conditional validation config
 * Example: {"requiredWhen": {"field": "hasPrescription", "eq": true}}
 */
export interface ConditionalValidationConfig extends BaseValidationConfig {
  /** When field is required */
  requiredWhen?: {
    field: string;
    eq?: unknown;
    neq?: unknown;
    in?: unknown[];
  };
  /** When field is hidden */
  hiddenWhen?: {
    field: string;
    eq?: unknown;
    neq?: unknown;
    in?: unknown[];
  };
}

/**
 * Unique validation config
 * Example: {"scope": ["organizationId"], "caseSensitive": false}
 */
export interface UniqueValidationConfig extends BaseValidationConfig {
  /** Fields to scope uniqueness to */
  scope?: string[];
  /** Whether comparison is case-sensitive */
  caseSensitive?: boolean;
}

/**
 * Union type for all validation configs
 */
export type ValidationConfig =
  | RequiredValidationConfig
  | FormatValidationConfig
  | RangeValidationConfig
  | EnumValidationConfig
  | ReferenceValidationConfig
  | ComputedValidationConfig
  | ConditionalValidationConfig
  | UniqueValidationConfig
  | Record<string, unknown>;

/**
 * Field validation entity
 */
export interface FieldValidation {
  id: string;

  /** Module containing the field */
  moduleName: string;

  /** Entity containing the field */
  entityName: string;

  /** Field to validate */
  fieldName: string;

  /** JSON path for nested fields */
  fieldPath?: string;

  /** Type of validation */
  validationType: FieldValidationType;

  /** Validation configuration */
  validationConfig: ValidationConfig;

  /** User-facing error message */
  errorMessage: string;

  /** Machine-readable error code */
  errorCode?: string;

  /** Severity level */
  severity: ValidationSeverity;

  /** Linked regulation ID */
  regulationId?: string;

  /** Linked module rule ID */
  moduleRuleId?: string;

  /** Geographic region */
  regionId?: string;

  /** Evaluation priority (higher = first) */
  priority: number;

  /** Whether validation is active */
  isActive: boolean;

  /** Effective start date */
  effectiveFrom: string;

  /** Effective end date */
  effectiveTo?: string;

  /** Organization ID (null for system-wide) */
  organizationId?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Create field validation request
 */
export interface CreateFieldValidationRequest {
  moduleName: string;
  entityName: string;
  fieldName: string;
  fieldPath?: string;
  validationType: FieldValidationType;
  validationConfig: ValidationConfig;
  errorMessage: string;
  errorCode?: string;
  severity?: ValidationSeverity;
  regulationId?: string;
  moduleRuleId?: string;
  regionId?: string;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  organizationId?: string;
}

/**
 * Update field validation request
 */
export interface UpdateFieldValidationRequest {
  validationConfig?: ValidationConfig;
  errorMessage?: string;
  errorCode?: string;
  severity?: ValidationSeverity;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

/**
 * Search field validations query
 */
export interface FieldValidationSearchQuery {
  moduleName?: string;
  entityName?: string;
  fieldName?: string;
  validationType?: FieldValidationType;
  regionId?: string;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Field validation list response
 */
export interface FieldValidationListResponse {
  data: FieldValidation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Validation result (from validating a value)
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error messages if validation failed */
  errors: ValidationError[];
  /** Warning messages */
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  fieldName: string;
  fieldPath?: string;
  errorCode?: string;
  message: string;
  validationType: FieldValidationType;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  fieldName: string;
  fieldPath?: string;
  message: string;
  validationType: FieldValidationType;
}

/**
 * Bulk validation request
 */
export interface BulkValidationRequest {
  moduleName: string;
  entityName: string;
  data: Record<string, unknown>;
  regionId?: string;
  organizationId?: string;
}

/**
 * Get validations for a field request
 */
export interface GetFieldValidationsRequest {
  moduleName: string;
  entityName: string;
  fieldName?: string;
  regionId?: string;
  organizationId?: string;
}

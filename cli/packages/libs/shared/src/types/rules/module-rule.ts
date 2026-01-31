/**
 * Module Rules types
 * Links regulations to specific modules and fields for location-aware validation
 */

/**
 * Module rule category - what type of rule this is
 */
export type ModuleRuleCategory =
  | "validation" // Field validation rule
  | "workflow" // Workflow requirement
  | "documentation" // Documentation requirement
  | "authorization" // Authorization rule
  | "notification" // Alert/notification trigger
  | "audit" // Audit requirement
  | "retention" // Data retention rule
  | "phi_protection"; // PHI/sensitive data rule

/**
 * Entity type that a rule can apply to
 */
export type RuleEntityType =
  | "Organization"
  | "Hospital"
  | "Facility"
  | "Department"
  | "Provider"
  | "Patient"
  | "User"
  | "Invoice"
  | "Service"
  | "Document"
  | "Medication"
  | "LabResult"
  | "Appointment";

/**
 * Module rule - links regulations to specific application modules
 */
export interface ModuleRule {
  id: string;

  /** Unique identifier for the rule (e.g., "IND-CDSCO-SCHEDULE-H") */
  ruleCode: string;

  /** Human-readable name */
  ruleName: string;

  /** Description of the rule */
  description?: string;

  /** Application module (pharmacy, billing, patient, ehr) */
  moduleName: string;

  /** Entity within the module (medication, prescription, patient) */
  entityName?: string;

  /** Linked regulation ID */
  regulationId?: string;

  /** Linked regulation section ID */
  sectionId?: string;

  /** Geographic region this rule applies to */
  regionId?: string;

  /** Category of rule */
  category: ModuleRuleCategory;

  /** Rule-specific configuration (JSON) */
  ruleDefinition: Record<string, unknown>;

  /** User-facing error message */
  errorMessage?: string;

  /** Machine-readable error code */
  errorCode?: string;

  /** Which entity types this applies to */
  entityType?: RuleEntityType;

  /** Higher priority = evaluated first */
  priority: number;

  /** Whether this rule is mandatory */
  isMandatory: boolean;

  /** When the rule becomes effective */
  effectiveFrom: string;

  /** When the rule expires */
  effectiveTo?: string;

  /** Whether the rule is active */
  isActive: boolean;

  /** Organization ID (null for system-wide) */
  organizationId?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Module rule with joined regulation data
 */
export interface ModuleRuleWithRegulation extends ModuleRule {
  /** Regulation details */
  regulation?: {
    id: string;
    name: string;
    shortName: string;
    jurisdictionType: string;
  };

  /** Region details */
  region?: {
    id: string;
    name: string;
    countryCode: string;
  };
}

/**
 * Create module rule request
 */
export interface CreateModuleRuleRequest {
  ruleCode: string;
  ruleName: string;
  description?: string;
  moduleName: string;
  entityName?: string;
  regulationId?: string;
  sectionId?: string;
  regionId?: string;
  category: ModuleRuleCategory;
  ruleDefinition: Record<string, unknown>;
  errorMessage?: string;
  errorCode?: string;
  entityType?: RuleEntityType;
  priority?: number;
  isMandatory?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  organizationId?: string;
}

/**
 * Update module rule request
 */
export interface UpdateModuleRuleRequest {
  ruleName?: string;
  description?: string;
  ruleDefinition?: Record<string, unknown>;
  errorMessage?: string;
  errorCode?: string;
  priority?: number;
  isMandatory?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

/**
 * Search module rules query
 */
export interface ModuleRuleSearchQuery {
  moduleName?: string;
  entityName?: string;
  category?: ModuleRuleCategory;
  regionId?: string;
  regulationId?: string;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Module rules list response
 */
export interface ModuleRuleListResponse {
  data: ModuleRuleWithRegulation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

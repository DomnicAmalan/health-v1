/**
 * EHR Allergy Schemas
 *
 * Runtime validation for allergy records.
 * Corresponds to VistA File #120.8 (^GMR)
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import { DateStringSchema, DateTimeSchema } from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Allergy Enums
// ============================================================================

/**
 * Allergy type schema
 */
export const EhrAllergyTypeSchema = z.enum(["drug", "food", "environmental", "other"]);

export type EhrAllergyType = z.infer<typeof EhrAllergyTypeSchema>;

/**
 * Allergy severity schema
 */
export const EhrAllergySeveritySchema = z.enum(["mild", "moderate", "severe", "life_threatening"]);

export type EhrAllergySeverity = z.infer<typeof EhrAllergySeveritySchema>;

/**
 * Allergy status schema
 */
export const EhrAllergyStatusSchema = z.enum(["active", "inactive", "entered_in_error"]);

export type EhrAllergyStatus = z.infer<typeof EhrAllergyStatusSchema>;

// ============================================================================
// Allergy Schema
// ============================================================================

/**
 * Full EHR Allergy schema
 */
export const EhrAllergySchema = z.object({
  // Identity
  id: z.string().uuid(),
  ien: z.number().int().positive(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),

  // Allergen details
  allergen: z.string().min(1, { message: "Allergen is required" }).max(200),
  allergyType: EhrAllergyTypeSchema,
  severity: EhrAllergySeveritySchema,
  status: EhrAllergyStatusSchema,

  // Reactions
  reactions: z.array(z.string()).optional(),
  reactionDate: DateStringSchema.optional(),
  onsetDate: DateStringSchema.optional(),

  // Verification
  verified: z.boolean(),
  verifiedBy: z.string().uuid().optional(),
  verifiedByName: z.string().optional(),
  verifiedAt: DateTimeSchema.optional(),

  // Additional info
  source: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),

  // Audit fields
  createdAt: DateTimeSchema.optional(),
  createdBy: z.string().optional(),
  updatedAt: DateTimeSchema.optional(),
  updatedBy: z.string().optional(),

  // MUMPS data
  mumpsData: z.record(z.unknown()).optional(),
}).refine(
  // Business rule: If verified, must have verifiedBy and verifiedAt
  data => {
    if (data.verified) {
      return !!data.verifiedBy && !!data.verifiedAt;
    }
    return true;
  },
  {
    message: "Verified allergies must have verifiedBy and verifiedAt fields",
    path: ["verified"],
  }
);

export type EhrAllergy = z.infer<typeof EhrAllergySchema>;

// Type guards
export const isEhrAllergy = createTypeGuard(EhrAllergySchema);

// Assertions
export const assertEhrAllergy = createAssertion(EhrAllergySchema, 'EhrAllergy');

// ============================================================================
// Create Allergy Request Schema
// ============================================================================

/**
 * Create allergy request validation
 */
export const CreateEhrAllergyRequestSchema = z.object({
  patientId: z.string().uuid(),
  allergen: z.string().min(1, { message: "Allergen is required" }).max(200),
  allergyType: EhrAllergyTypeSchema,
  severity: EhrAllergySeveritySchema.optional(),
  reactions: z.string().max(1000).optional(),
  reactionDate: DateStringSchema.optional(),
  source: z.string().max(200).optional(),
  comments: z.string().max(2000).optional(),
});

export type CreateEhrAllergyRequest = z.infer<typeof CreateEhrAllergyRequestSchema>;

// Type guards
export const isCreateEhrAllergyRequest = createTypeGuard(CreateEhrAllergyRequestSchema);

// Assertions
export const assertCreateEhrAllergyRequest = createAssertion(
  CreateEhrAllergyRequestSchema,
  'CreateEhrAllergyRequest'
);

// ============================================================================
// Update Allergy Request Schema
// ============================================================================

/**
 * Update allergy request validation
 */
export const UpdateEhrAllergyRequestSchema = CreateEhrAllergyRequestSchema.partial().extend({
  id: z.string().uuid(),
  status: EhrAllergyStatusSchema.optional(),
});

export type UpdateEhrAllergyRequest = z.infer<typeof UpdateEhrAllergyRequestSchema>;

// Type guards
export const isUpdateEhrAllergyRequest = createTypeGuard(UpdateEhrAllergyRequestSchema);

// Assertions
export const assertUpdateEhrAllergyRequest = createAssertion(
  UpdateEhrAllergyRequestSchema,
  'UpdateEhrAllergyRequest'
);

// ============================================================================
// Allergy Search Criteria Schema
// ============================================================================

/**
 * Allergy search criteria validation
 */
export const EhrAllergySearchCriteriaSchema = z.object({
  patientId: z.string().uuid().optional(),
  allergyType: EhrAllergyTypeSchema.optional(),
  status: EhrAllergyStatusSchema.optional(),
  allergen: z.string().optional(),
  verifiedOnly: z.boolean().optional(),
});

export type EhrAllergySearchCriteria = z.infer<typeof EhrAllergySearchCriteriaSchema>;

// Type guards
export const isEhrAllergySearchCriteria = createTypeGuard(EhrAllergySearchCriteriaSchema);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if allergy is active
 */
export function isAllergyActive(allergy: EhrAllergy): boolean {
  return allergy.status === "active";
}

/**
 * Check if allergy is life-threatening
 */
export function isLifeThreatening(allergy: EhrAllergy): boolean {
  return allergy.severity === "life_threatening";
}

/**
 * Check if allergy is verified
 */
export function isVerified(allergy: EhrAllergy): boolean {
  return allergy.verified && !!allergy.verifiedBy && !!allergy.verifiedAt;
}

/**
 * Get severity display color
 */
export function getSeverityColor(severity: EhrAllergySeverity): string {
  const colors: Record<EhrAllergySeverity, string> = {
    mild: "yellow",
    moderate: "orange",
    severe: "red",
    life_threatening: "red",
  };
  return colors[severity];
}

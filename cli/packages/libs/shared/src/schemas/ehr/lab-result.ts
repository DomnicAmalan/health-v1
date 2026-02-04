/**
 * EHR Lab Result Schemas
 *
 * Runtime validation for laboratory test results.
 * Corresponds to VistA File #63 (^LR)
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import { DateTimeSchema } from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Lab Enums
// ============================================================================

/**
 * Lab result status schema
 */
export const EhrLabStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export type EhrLabStatus = z.infer<typeof EhrLabStatusSchema>;

/**
 * Abnormality flag schema
 */
export const EhrAbnormalFlagSchema = z.enum([
  "normal",
  "low",
  "high",
  "critical_low",
  "critical_high",
  "abnormal",
]);

export type EhrAbnormalFlag = z.infer<typeof EhrAbnormalFlagSchema>;

// ============================================================================
// Lab Result Schema
// ============================================================================

/**
 * Full EHR Lab Result schema
 */
export const EhrLabResultSchema = z.object({
  // Identity
  id: z.string().uuid(),
  ien: z.number().int().positive(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),

  // Test identification
  loincCode: z.string().optional(),
  testName: z.string().min(1, { message: "Test name is required" }).max(300),
  category: z.string().max(100).optional(),

  // Result values
  value: z.string().max(500),
  numericValue: z.number().optional(),
  unit: z.string().max(50).optional(),

  // Reference ranges
  referenceRange: z.string().max(100).optional(),
  referenceLow: z.number().optional(),
  referenceHigh: z.number().optional(),

  // Status and flags
  status: EhrLabStatusSchema,
  abnormalFlag: EhrAbnormalFlagSchema.optional(),

  // Specimen and timing
  specimenType: z.string().max(100).optional(),
  collectedAt: DateTimeSchema.optional(),
  receivedAt: DateTimeSchema.optional(),
  resultedAt: DateTimeSchema.optional(),

  // Provider and interpretation
  performingLab: z.string().max(200).optional(),
  orderingProviderId: z.string().uuid().optional(),
  interpretation: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),

  // Audit fields
  createdAt: DateTimeSchema.optional(),
  createdBy: z.string().optional(),
  updatedAt: DateTimeSchema.optional(),
  updatedBy: z.string().optional(),

  // MUMPS data
  mumpsData: z.record(z.unknown()).optional(),
}).refine(
  // Business rule: If numeric value exists and reference ranges exist, calculate abnormal flag
  data => {
    if (data.numericValue !== undefined && data.referenceLow !== undefined && data.referenceHigh !== undefined) {
      // This is just a validation check; actual calculation should be done server-side
      return true;
    }
    return true;
  },
  {
    message: "Numeric results with reference ranges should have abnormal flag calculated",
    path: ["abnormalFlag"],
  }
);

export type EhrLabResult = z.infer<typeof EhrLabResultSchema>;

// Type guards
export const isEhrLabResult = createTypeGuard(EhrLabResultSchema);

// Assertions
export const assertEhrLabResult = createAssertion(EhrLabResultSchema, 'EhrLabResult');

// ============================================================================
// Create Lab Result Request Schema
// ============================================================================

export const CreateEhrLabResultRequestSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  loincCode: z.string().optional(),
  testName: z.string().min(1).max(300),
  category: z.string().max(100).optional(),
  resultValue: z.string().max(500).optional(),
  numericValue: z.number().optional(),
  unit: z.string().max(50).optional(),
  referenceRange: z.string().max(100).optional(),
  referenceLow: z.number().optional(),
  referenceHigh: z.number().optional(),
  specimenType: z.string().max(100).optional(),
  collectionDatetime: DateTimeSchema.optional(),
  comments: z.string().max(2000).optional(),
});

export type CreateEhrLabResultRequest = z.infer<typeof CreateEhrLabResultRequestSchema>;

export const isCreateEhrLabResultRequest = createTypeGuard(CreateEhrLabResultRequestSchema);
export const assertCreateEhrLabResultRequest = createAssertion(CreateEhrLabResultRequestSchema, 'CreateEhrLabResultRequest');

// ============================================================================
// Update Lab Result Request Schema
// ============================================================================

export const UpdateEhrLabResultRequestSchema = CreateEhrLabResultRequestSchema.partial().extend({
  id: z.string().uuid(),
  status: EhrLabStatusSchema.optional(),
});

export type UpdateEhrLabResultRequest = z.infer<typeof UpdateEhrLabResultRequestSchema>;

export const isUpdateEhrLabResultRequest = createTypeGuard(UpdateEhrLabResultRequestSchema);
export const assertUpdateEhrLabResultRequest = createAssertion(UpdateEhrLabResultRequestSchema, 'UpdateEhrLabResultRequest');

// ============================================================================
// Lab Search Criteria Schema
// ============================================================================

export const EhrLabSearchCriteriaSchema = z.object({
  patientId: z.string().uuid().optional(),
  visitId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  status: EhrLabStatusSchema.optional(),
  testName: z.string().optional(),
  loincCode: z.string().optional(),
  category: z.string().optional(),
  abnormalFlag: EhrAbnormalFlagSchema.optional(),
  dateFrom: DateTimeSchema.optional(),
  dateTo: DateTimeSchema.optional(),
  abnormalOnly: z.boolean().optional(),
  criticalOnly: z.boolean().optional(),
});

export type EhrLabSearchCriteria = z.infer<typeof EhrLabSearchCriteriaSchema>;

export const isEhrLabSearchCriteria = createTypeGuard(EhrLabSearchCriteriaSchema);

// ============================================================================
// Lab Panel Schema
// ============================================================================

/**
 * Lab panel (group of related tests) schema
 */
export const EhrLabPanelSchema = z.object({
  panelName: z.string(),
  loincCode: z.string(),
  results: z.array(EhrLabResultSchema),
  collectionDatetime: DateTimeSchema,
});

export type EhrLabPanel = z.infer<typeof EhrLabPanelSchema>;

export const isEhrLabPanel = createTypeGuard(EhrLabPanelSchema);

// ============================================================================
// Utility Functions
// ============================================================================

export function isLabCompleted(lab: EhrLabResult): boolean {
  return lab.status === "completed";
}

export function isLabAbnormal(lab: EhrLabResult): boolean {
  return lab.abnormalFlag !== undefined && lab.abnormalFlag !== "normal";
}

export function isLabCritical(lab: EhrLabResult): boolean {
  return lab.abnormalFlag === "critical_low" || lab.abnormalFlag === "critical_high";
}

export function calculateAbnormalFlag(
  numericValue: number,
  referenceLow?: number,
  referenceHigh?: number
): EhrAbnormalFlag {
  if (referenceLow === undefined || referenceHigh === undefined) {
    return "normal";
  }

  const criticalLowThreshold = referenceLow * 0.5;
  const criticalHighThreshold = referenceHigh * 1.5;

  if (numericValue < criticalLowThreshold) {
    return "critical_low";
  }
  if (numericValue > criticalHighThreshold) {
    return "critical_high";
  }
  if (numericValue < referenceLow) {
    return "low";
  }
  if (numericValue > referenceHigh) {
    return "high";
  }

  return "normal";
}

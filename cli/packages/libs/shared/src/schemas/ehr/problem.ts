/**
 * EHR Problem List Schemas
 *
 * Runtime validation for problem list management.
 * Corresponds to VistA File #9000011 (^AUPNPROB)
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import { DateStringSchema, DateTimeSchema } from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Problem Enums
// ============================================================================

/**
 * Problem status schema
 */
export const EhrProblemStatusSchema = z.enum(["active", "inactive", "resolved"]);

export type EhrProblemStatus = z.infer<typeof EhrProblemStatusSchema>;

/**
 * Problem acuity schema
 */
export const EhrProblemAcuitySchema = z.enum(["acute", "chronic"]);

export type EhrProblemAcuity = z.infer<typeof EhrProblemAcuitySchema>;

// ============================================================================
// Problem Schema
// ============================================================================

/**
 * Full EHR Problem schema
 */
export const EhrProblemSchema = z.object({
  // Identity
  id: z.string().uuid(),
  ien: z.number().int().positive(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),

  // Coding
  icd10Code: z.string().optional(),
  snomedCode: z.string().optional(),
  description: z.string().min(1, { message: "Problem description is required" }).max(500),

  // Status
  status: EhrProblemStatusSchema,
  acuity: EhrProblemAcuitySchema,

  // Dates
  onsetDate: DateStringSchema.optional(),
  resolvedDate: DateStringSchema.optional(),
  priority: z.number().int().min(1).max(10).optional(),

  // Provider
  providerId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),

  // Audit fields
  createdAt: DateTimeSchema.optional(),
  createdBy: z.string().optional(),
  updatedAt: DateTimeSchema.optional(),
  updatedBy: z.string().optional(),

  // MUMPS data
  mumpsData: z.record(z.string(), z.unknown()).optional(),
}).refine(
  // Business rule: If resolved, must have resolvedDate
  data => {
    if (data.status === "resolved") {
      return !!data.resolvedDate;
    }
    return true;
  },
  {
    message: "Resolved problems must have a resolved date",
    path: ["resolvedDate"],
  }
).refine(
  // Business rule: If resolvedDate exists, it must be after onsetDate
  data => {
    if (data.resolvedDate && data.onsetDate) {
      return new Date(data.resolvedDate) >= new Date(data.onsetDate);
    }
    return true;
  },
  {
    message: "Resolved date must be after onset date",
    path: ["resolvedDate"],
  }
);

export type EhrProblem = z.infer<typeof EhrProblemSchema>;

// Type guards
export const isEhrProblem = createTypeGuard(EhrProblemSchema);

// Assertions
export const assertEhrProblem = createAssertion(EhrProblemSchema, 'EhrProblem');

// ============================================================================
// Create Problem Request Schema
// ============================================================================

export const CreateEhrProblemRequestSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  icd10Code: z.string().optional(),
  snomedCode: z.string().optional(),
  description: z.string().min(1, { message: "Problem description is required" }).max(500),
  acuity: EhrProblemAcuitySchema.optional(),
  onsetDate: DateStringSchema.optional(),
  priority: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateEhrProblemRequest = z.infer<typeof CreateEhrProblemRequestSchema>;

export const isCreateEhrProblemRequest = createTypeGuard(CreateEhrProblemRequestSchema);
export const assertCreateEhrProblemRequest = createAssertion(CreateEhrProblemRequestSchema, 'CreateEhrProblemRequest');

// ============================================================================
// Update Problem Request Schema
// ============================================================================

export const UpdateEhrProblemRequestSchema = CreateEhrProblemRequestSchema.partial().extend({
  id: z.string().uuid(),
  status: EhrProblemStatusSchema.optional(),
  resolvedDate: DateStringSchema.optional(),
});

export type UpdateEhrProblemRequest = z.infer<typeof UpdateEhrProblemRequestSchema>;

export const isUpdateEhrProblemRequest = createTypeGuard(UpdateEhrProblemRequestSchema);
export const assertUpdateEhrProblemRequest = createAssertion(UpdateEhrProblemRequestSchema, 'UpdateEhrProblemRequest');

// ============================================================================
// Problem Search Criteria Schema
// ============================================================================

export const EhrProblemSearchCriteriaSchema = z.object({
  patientId: z.string().uuid().optional(),
  status: EhrProblemStatusSchema.optional(),
  icd10Code: z.string().optional(),
  description: z.string().optional(),
  providerId: z.string().uuid().optional(),
});

export type EhrProblemSearchCriteria = z.infer<typeof EhrProblemSearchCriteriaSchema>;

export const isEhrProblemSearchCriteria = createTypeGuard(EhrProblemSearchCriteriaSchema);

// ============================================================================
// Utility Functions
// ============================================================================

export function isProblemActive(problem: EhrProblem): boolean {
  return problem.status === "active";
}

export function isProblemResolved(problem: EhrProblem): boolean {
  return problem.status === "resolved";
}

export function isProblemChronic(problem: EhrProblem): boolean {
  return problem.acuity === "chronic";
}

export function getProblemDuration(problem: EhrProblem): number | null {
  if (!problem.onsetDate) {
    return null;
  }

  const endDate = problem.resolvedDate ? new Date(problem.resolvedDate) : new Date();
  const startDate = new Date(problem.onsetDate);
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return daysDiff;
}

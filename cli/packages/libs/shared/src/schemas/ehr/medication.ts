/**
 * EHR Medication Schemas
 *
 * Runtime validation for medication records.
 * Corresponds to VistA File #52 (^PS)
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import { DateStringSchema, DateTimeSchema } from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Medication Enums
// ============================================================================

/**
 * Medication status schema
 */
export const EhrMedicationStatusSchema = z.enum([
  "active",
  "completed",
  "discontinued",
  "on_hold",
  "cancelled",
]);

export type EhrMedicationStatus = z.infer<typeof EhrMedicationStatusSchema>;

/**
 * Medication type schema
 */
export const EhrMedicationTypeSchema = z.enum(["outpatient", "inpatient", "iv", "prn"]);

export type EhrMedicationType = z.infer<typeof EhrMedicationTypeSchema>;

// ============================================================================
// Medication Schema
// ============================================================================

/**
 * Full EHR Medication schema
 */
export const EhrMedicationSchema = z.object({
  // Identity
  id: z.string().uuid(),
  ien: z.number().int().positive(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),

  // Drug identification
  rxnormCode: z.string().optional(),
  ndcCode: z.string().optional(),
  drugName: z.string().min(1, { message: "Drug name is required" }).max(300),
  brandName: z.string().max(300).optional(),

  // Dosage information
  dosage: z.string().min(1, { message: "Dosage is required" }).max(100),
  dosageForm: z.string().max(100).optional(),
  route: z.string().max(100).optional(),
  frequency: z.string().min(1, { message: "Frequency is required" }).max(100),
  sig: z.string().min(1, { message: "Sig (directions) is required" }).max(500),

  // Quantity and refills
  quantity: z.number().nonnegative().optional(),
  daysSupply: z.number().int().positive().optional(),
  refillsRemaining: z.number().int().nonnegative().optional(),

  // Status and type
  status: EhrMedicationStatusSchema,
  medicationType: EhrMedicationTypeSchema,

  // Dates
  startDate: DateStringSchema,
  endDate: DateStringSchema.optional(),
  discontinuedDate: DateStringSchema.optional(),
  discontinuedReason: z.string().max(500).optional(),

  // Prescriber and pharmacy
  prescriberId: z.string().uuid().optional(),
  pharmacy: z.string().max(200).optional(),
  instructions: z.string().max(1000).optional(),

  // Audit fields
  createdAt: DateTimeSchema.optional(),
  createdBy: z.string().optional(),
  updatedAt: DateTimeSchema.optional(),
  updatedBy: z.string().optional(),

  // MUMPS data
  mumpsData: z.record(z.string(), z.unknown()).optional(),
}).refine(
  // Business rule: If discontinued, must have discontinuedDate and reason
  data => {
    if (data.status === "discontinued") {
      return !!data.discontinuedDate && !!data.discontinuedReason;
    }
    return true;
  },
  {
    message: "Discontinued medications must have discontinuedDate and discontinuedReason",
    path: ["discontinuedDate"],
  }
).refine(
  // Business rule: If endDate exists, it must be after startDate
  data => {
    if (data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

export type EhrMedication = z.infer<typeof EhrMedicationSchema>;

// Type guards
export const isEhrMedication = createTypeGuard(EhrMedicationSchema);

// Assertions
export const assertEhrMedication = createAssertion(EhrMedicationSchema, 'EhrMedication');

// ============================================================================
// Create Medication Request Schema
// ============================================================================

/**
 * Create medication request validation
 */
export const CreateEhrMedicationRequestSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  rxnormCode: z.string().optional(),
  drugName: z.string().min(1, { message: "Drug name is required" }).max(300),
  dosage: z.string().min(1, { message: "Dosage is required" }).max(100),
  route: z.string().max(100).optional(),
  frequency: z.string().min(1, { message: "Frequency is required" }).max(100),
  sig: z.string().min(1, { message: "Sig (directions) is required" }).max(500),
  quantity: z.number().nonnegative().optional(),
  daysSupply: z.number().int().positive().optional(),
  refillsRemaining: z.number().int().nonnegative().optional(),
  startDate: DateStringSchema.optional(),
  instructions: z.string().max(1000).optional(),
});

export type CreateEhrMedicationRequest = z.infer<typeof CreateEhrMedicationRequestSchema>;

// Type guards
export const isCreateEhrMedicationRequest = createTypeGuard(CreateEhrMedicationRequestSchema);

// Assertions
export const assertCreateEhrMedicationRequest = createAssertion(
  CreateEhrMedicationRequestSchema,
  'CreateEhrMedicationRequest'
);

// ============================================================================
// Update Medication Request Schema
// ============================================================================

/**
 * Update medication request validation
 */
export const UpdateEhrMedicationRequestSchema = CreateEhrMedicationRequestSchema.partial().extend({
  id: z.string().uuid(),
  status: EhrMedicationStatusSchema.optional(),
  discontinuedReason: z.string().max(500).optional(),
});

export type UpdateEhrMedicationRequest = z.infer<typeof UpdateEhrMedicationRequestSchema>;

// Type guards
export const isUpdateEhrMedicationRequest = createTypeGuard(UpdateEhrMedicationRequestSchema);

// Assertions
export const assertUpdateEhrMedicationRequest = createAssertion(
  UpdateEhrMedicationRequestSchema,
  'UpdateEhrMedicationRequest'
);

// ============================================================================
// Medication Search Criteria Schema
// ============================================================================

/**
 * Medication search criteria validation
 */
export const EhrMedicationSearchCriteriaSchema = z.object({
  patientId: z.string().uuid().optional(),
  status: EhrMedicationStatusSchema.optional(),
  drugName: z.string().optional(),
  rxnormCode: z.string().optional(),
  prescriberId: z.string().uuid().optional(),
  activeOnly: z.boolean().optional(),
});

export type EhrMedicationSearchCriteria = z.infer<typeof EhrMedicationSearchCriteriaSchema>;

// Type guards
export const isEhrMedicationSearchCriteria = createTypeGuard(EhrMedicationSearchCriteriaSchema);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if medication is active
 */
export function isMedicationActive(medication: EhrMedication): boolean {
  return medication.status === "active";
}

/**
 * Check if medication can be refilled
 */
export function canRefill(medication: EhrMedication): boolean {
  return (
    medication.status === "active" &&
    typeof medication.refillsRemaining === "number" &&
    medication.refillsRemaining > 0
  );
}

/**
 * Check if medication is discontinued
 */
export function isMedicationDiscontinued(medication: EhrMedication): boolean {
  return medication.status === "discontinued";
}

/**
 * Get remaining days supply
 */
export function getRemainingDaysSupply(medication: EhrMedication): number | null {
  if (!medication.daysSupply || !medication.startDate) {
    return null;
  }

  const start = new Date(medication.startDate);
  const now = new Date();
  const daysPassed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const remaining = medication.daysSupply - daysPassed;

  return Math.max(0, remaining);
}

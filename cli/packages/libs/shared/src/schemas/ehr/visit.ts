/**
 * EHR Visit/Encounter Schemas
 *
 * Runtime validation for patient visits and encounters.
 * Corresponds to VistA File #9000010 (^AUPNVSIT)
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import { DateTimeSchema } from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Visit Enums
// ============================================================================

/**
 * Visit type schema
 */
export const EhrVisitTypeSchema = z.enum([
  "outpatient",
  "inpatient",
  "emergency",
  "telehealth",
  "home",
  "observation",
]);

export type EhrVisitType = z.infer<typeof EhrVisitTypeSchema>;

/**
 * Visit status schema
 */
export const EhrVisitStatusSchema = z.enum([
  "scheduled",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export type EhrVisitStatus = z.infer<typeof EhrVisitStatusSchema>;

// ============================================================================
// Visit Schema
// ============================================================================

/**
 * Full EHR Visit schema
 */
export const EhrVisitSchema = z.object({
  // Identity
  id: z.string().uuid(),
  ien: z.number().int().positive(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),

  // Visit details
  visitType: EhrVisitTypeSchema,
  status: EhrVisitStatusSchema,
  visitDatetime: DateTimeSchema,
  checkInTime: DateTimeSchema.optional(),
  checkOutTime: DateTimeSchema.optional(),

  // Location and provider
  locationId: z.string().uuid().optional(),
  locationName: z.string().optional(),
  providerId: z.string().uuid().optional(),
  providerName: z.string().optional(),

  // Clinical details
  chiefComplaint: z.string().max(500).optional(),
  reasonForVisit: z.string().max(500).optional(),
  serviceCategory: z.string().max(200).optional(),
  disposition: z.string().max(200).optional(),

  // Audit fields
  createdAt: DateTimeSchema.optional(),
  createdBy: z.string().optional(),
  updatedAt: DateTimeSchema.optional(),
  updatedBy: z.string().optional(),

  // MUMPS data
  mumpsData: z.record(z.unknown()).optional(),
}).refine(
  // Business rule: If checked out, must have check-in time
  data => {
    if (data.checkOutTime) {
      return !!data.checkInTime;
    }
    return true;
  },
  {
    message: "Check-out time requires check-in time",
    path: ["checkInTime"],
  }
).refine(
  // Business rule: Check-out must be after check-in
  data => {
    if (data.checkOutTime && data.checkInTime) {
      return new Date(data.checkOutTime) > new Date(data.checkInTime);
    }
    return true;
  },
  {
    message: "Check-out time must be after check-in time",
    path: ["checkOutTime"],
  }
);

export type EhrVisit = z.infer<typeof EhrVisitSchema>;

// Type guards
export const isEhrVisit = createTypeGuard(EhrVisitSchema);

// Assertions
export const assertEhrVisit = createAssertion(EhrVisitSchema, 'EhrVisit');

// ============================================================================
// Create Visit Request Schema
// ============================================================================

export const CreateEhrVisitRequestSchema = z.object({
  patientId: z.string().uuid(),
  visitType: EhrVisitTypeSchema,
  visitDatetime: DateTimeSchema,
  locationId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  chiefComplaint: z.string().max(500).optional(),
  reasonForVisit: z.string().max(500).optional(),
});

export type CreateEhrVisitRequest = z.infer<typeof CreateEhrVisitRequestSchema>;

export const isCreateEhrVisitRequest = createTypeGuard(CreateEhrVisitRequestSchema);
export const assertCreateEhrVisitRequest = createAssertion(CreateEhrVisitRequestSchema, 'CreateEhrVisitRequest');

// ============================================================================
// Update Visit Request Schema
// ============================================================================

export const UpdateEhrVisitRequestSchema = CreateEhrVisitRequestSchema.partial().extend({
  id: z.string().uuid(),
  status: EhrVisitStatusSchema.optional(),
  disposition: z.string().max(200).optional(),
});

export type UpdateEhrVisitRequest = z.infer<typeof UpdateEhrVisitRequestSchema>;

export const isUpdateEhrVisitRequest = createTypeGuard(UpdateEhrVisitRequestSchema);
export const assertUpdateEhrVisitRequest = createAssertion(UpdateEhrVisitRequestSchema, 'UpdateEhrVisitRequest');

// ============================================================================
// Visit Search Criteria Schema
// ============================================================================

export const EhrVisitSearchCriteriaSchema = z.object({
  patientId: z.string().uuid().optional(),
  visitType: EhrVisitTypeSchema.optional(),
  status: EhrVisitStatusSchema.optional(),
  providerId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  dateFrom: DateTimeSchema.optional(),
  dateTo: DateTimeSchema.optional(),
});

export type EhrVisitSearchCriteria = z.infer<typeof EhrVisitSearchCriteriaSchema>;

export const isEhrVisitSearchCriteria = createTypeGuard(EhrVisitSearchCriteriaSchema);

// ============================================================================
// Utility Functions
// ============================================================================

export function isVisitCompleted(visit: EhrVisit): boolean {
  return visit.status === "completed";
}

export function isVisitInProgress(visit: EhrVisit): boolean {
  return visit.status === "in_progress";
}

export function getVisitDuration(visit: EhrVisit): number | null {
  if (!visit.checkInTime || !visit.checkOutTime) {
    return null;
  }

  const checkIn = new Date(visit.checkInTime);
  const checkOut = new Date(visit.checkOutTime);
  const durationMinutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));

  return durationMinutes;
}

export function canCheckIn(visit: EhrVisit): boolean {
  return visit.status === "scheduled";
}

export function canCheckOut(visit: EhrVisit): boolean {
  return ["checked_in", "in_progress"].includes(visit.status);
}

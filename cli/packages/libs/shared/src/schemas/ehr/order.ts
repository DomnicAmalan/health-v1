/**
 * EHR Order Schemas
 *
 * Runtime validation for clinical orders.
 * Corresponds to VistA File #100 (^OR)
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import { DateTimeSchema } from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Order Enums
// ============================================================================

/**
 * Order type schema
 */
export const EhrOrderTypeSchema = z.enum([
  "lab",
  "radiology",
  "medication",
  "consult",
  "procedure",
  "diet",
  "nursing",
  "activity",
  "other",
]);

export type EhrOrderType = z.infer<typeof EhrOrderTypeSchema>;

/**
 * Order status schema
 */
export const EhrOrderStatusSchema = z.enum([
  "pending",
  "active",
  "completed",
  "discontinued",
  "cancelled",
  "expired",
  "held",
]);

export type EhrOrderStatus = z.infer<typeof EhrOrderStatusSchema>;

/**
 * Order urgency schema
 */
export const EhrOrderUrgencySchema = z.enum(["stat", "asap", "routine", "timed"]);

export type EhrOrderUrgency = z.infer<typeof EhrOrderUrgencySchema>;

// ============================================================================
// Order Schema
// ============================================================================

/**
 * Full EHR Order schema
 */
export const EhrOrderSchema = z.object({
  // Identity
  id: z.string().uuid(),
  ien: z.number().int().positive(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),

  // Order details
  orderType: EhrOrderTypeSchema,
  orderText: z.string().min(1, { message: "Order text is required" }).max(1000),
  orderableCode: z.string().optional(),

  // Status and urgency
  status: EhrOrderStatusSchema,
  urgency: EhrOrderUrgencySchema,

  // Timing
  startDatetime: DateTimeSchema,
  stopDatetime: DateTimeSchema.optional(),

  // Provider
  orderingProviderId: z.string().uuid(),
  orderingProviderName: z.string().optional(),

  // Signature
  signedBy: z.string().uuid().optional(),
  signedDatetime: DateTimeSchema.optional(),

  // Discontinuation
  discontinuedBy: z.string().uuid().optional(),
  discontinuedDatetime: DateTimeSchema.optional(),
  discontinuedReason: z.string().max(500).optional(),

  // Clinical context
  instructions: z.string().max(2000).optional(),
  indication: z.string().max(500).optional(),
  diagnosisCode: z.string().optional(),

  // Extended details
  orderDetails: z.record(z.string(), z.unknown()).optional(),

  // Audit fields
  createdAt: DateTimeSchema.optional(),
  createdBy: z.string().optional(),
  updatedAt: DateTimeSchema.optional(),
  updatedBy: z.string().optional(),

  // MUMPS data
  mumpsData: z.record(z.string(), z.unknown()).optional(),
}).refine(
  // Business rule: If discontinued, must have reason
  data => {
    if (data.status === "discontinued") {
      return !!data.discontinuedReason;
    }
    return true;
  },
  {
    message: "Discontinued orders must have a discontinuation reason",
    path: ["discontinuedReason"],
  }
).refine(
  // Business rule: If stopDatetime exists, must be after startDatetime
  data => {
    if (data.stopDatetime) {
      return new Date(data.stopDatetime) > new Date(data.startDatetime);
    }
    return true;
  },
  {
    message: "Stop time must be after start time",
    path: ["stopDatetime"],
  }
);

export type EhrOrder = z.infer<typeof EhrOrderSchema>;

// Type guards
export const isEhrOrder = createTypeGuard(EhrOrderSchema);

// Assertions
export const assertEhrOrder = createAssertion(EhrOrderSchema, 'EhrOrder');

// ============================================================================
// Create Order Request Schema
// ============================================================================

export const CreateEhrOrderRequestSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  orderType: EhrOrderTypeSchema,
  orderText: z.string().min(1).max(1000),
  orderableCode: z.string().optional(),
  urgency: EhrOrderUrgencySchema.optional(),
  instructions: z.string().max(2000).optional(),
  indication: z.string().max(500).optional(),
  diagnosisCode: z.string().optional(),
  orderDetails: z.record(z.string(), z.unknown()).optional(),
});

export type CreateEhrOrderRequest = z.infer<typeof CreateEhrOrderRequestSchema>;

export const isCreateEhrOrderRequest = createTypeGuard(CreateEhrOrderRequestSchema);
export const assertCreateEhrOrderRequest = createAssertion(CreateEhrOrderRequestSchema, 'CreateEhrOrderRequest');

// ============================================================================
// Update Order Request Schema
// ============================================================================

export const UpdateEhrOrderRequestSchema = CreateEhrOrderRequestSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateEhrOrderRequest = z.infer<typeof UpdateEhrOrderRequestSchema>;

export const isUpdateEhrOrderRequest = createTypeGuard(UpdateEhrOrderRequestSchema);
export const assertUpdateEhrOrderRequest = createAssertion(UpdateEhrOrderRequestSchema, 'UpdateEhrOrderRequest');

// ============================================================================
// Discontinue Order Request Schema
// ============================================================================

export const DiscontinueEhrOrderRequestSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, { message: "Discontinuation reason is required" }).max(500),
});

export type DiscontinueEhrOrderRequest = z.infer<typeof DiscontinueEhrOrderRequestSchema>;

export const isDiscontinueEhrOrderRequest = createTypeGuard(DiscontinueEhrOrderRequestSchema);
export const assertDiscontinueEhrOrderRequest = createAssertion(DiscontinueEhrOrderRequestSchema, 'DiscontinueEhrOrderRequest');

// ============================================================================
// Order Search Criteria Schema
// ============================================================================

export const EhrOrderSearchCriteriaSchema = z.object({
  patientId: z.string().uuid().optional(),
  visitId: z.string().uuid().optional(),
  orderType: EhrOrderTypeSchema.optional(),
  status: EhrOrderStatusSchema.optional(),
  urgency: EhrOrderUrgencySchema.optional(),
  orderingProviderId: z.string().uuid().optional(),
  orderText: z.string().optional(),
  dateFrom: DateTimeSchema.optional(),
  dateTo: DateTimeSchema.optional(),
  activeOnly: z.boolean().optional(),
  unsignedOnly: z.boolean().optional(),
});

export type EhrOrderSearchCriteria = z.infer<typeof EhrOrderSearchCriteriaSchema>;

export const isEhrOrderSearchCriteria = createTypeGuard(EhrOrderSearchCriteriaSchema);

// ============================================================================
// Order Detail Schemas
// ============================================================================

export const LabOrderDetailsSchema = z.object({
  testName: z.string(),
  loincCode: z.string().optional(),
  specimenType: z.string().optional(),
  fasting: z.boolean().optional(),
  collectionInstructions: z.string().optional(),
});

export type LabOrderDetails = z.infer<typeof LabOrderDetailsSchema>;

export const RadiologyOrderDetailsSchema = z.object({
  procedureName: z.string(),
  modality: z.string().optional(),
  bodyPart: z.string().optional(),
  laterality: z.enum(["left", "right", "bilateral"]).optional(),
  contrast: z.boolean().optional(),
  transportMode: z.string().optional(),
});

export type RadiologyOrderDetails = z.infer<typeof RadiologyOrderDetailsSchema>;

export const MedicationOrderDetailsSchema = z.object({
  drugName: z.string(),
  rxnormCode: z.string().optional(),
  dosage: z.string(),
  route: z.string(),
  frequency: z.string(),
  duration: z.string().optional(),
  prn: z.boolean().optional(),
  prnReason: z.string().optional(),
});

export type MedicationOrderDetails = z.infer<typeof MedicationOrderDetailsSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

export function isOrderActive(order: EhrOrder): boolean {
  return order.status === "active";
}

export function isOrderPending(order: EhrOrder): boolean {
  return order.status === "pending";
}

export function isOrderSigned(order: EhrOrder): boolean {
  return !!order.signedBy && !!order.signedDatetime;
}

export function canDiscontinueOrder(order: EhrOrder): boolean {
  return ["pending", "active", "held"].includes(order.status);
}

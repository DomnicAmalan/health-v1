/**
 * EHR Appointment Schemas
 *
 * Runtime validation for appointment scheduling and management.
 * Corresponds to VistA File #44 (^SD)
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import { DateTimeSchema } from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Appointment Enums
// ============================================================================

/**
 * Appointment status schema
 */
export const EhrAppointmentStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "checked_in",
  "in_room",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
]);

export type EhrAppointmentStatus = z.infer<typeof EhrAppointmentStatusSchema>;

/**
 * Appointment type schema
 */
export const EhrAppointmentTypeSchema = z.enum([
  "new_patient",
  "follow_up",
  "annual_exam",
  "urgent",
  "telehealth",
  "procedure",
  "lab",
  "other",
]);

export type EhrAppointmentType = z.infer<typeof EhrAppointmentTypeSchema>;

// ============================================================================
// Constants
// ============================================================================

/**
 * Appointment type display names
 */
export const APPOINTMENT_TYPE_NAMES: Record<EhrAppointmentType, string> = {
  new_patient: "New Patient",
  follow_up: "Follow-up",
  annual_exam: "Annual Exam",
  urgent: "Urgent",
  telehealth: "Telehealth",
  procedure: "Procedure",
  lab: "Lab",
  other: "Other",
};

/**
 * Default durations in minutes
 */
export const APPOINTMENT_DURATIONS: Record<EhrAppointmentType, number> = {
  new_patient: 60,
  follow_up: 20,
  annual_exam: 45,
  urgent: 15,
  telehealth: 20,
  procedure: 60,
  lab: 15,
  other: 30,
};

// ============================================================================
// Appointment Schema
// ============================================================================

/**
 * Full EHR Appointment schema
 */
export const EhrAppointmentSchema = z.object({
  // Identity
  id: z.string().uuid(),
  ien: z.number().int().positive(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),

  // Type and status
  appointmentType: EhrAppointmentTypeSchema,
  status: EhrAppointmentStatusSchema,

  // Scheduling
  scheduledDatetime: DateTimeSchema,
  durationMinutes: z.number().int().positive(),
  scheduledEndDatetime: DateTimeSchema,

  // Provider and location
  providerId: z.string().uuid().optional(),
  providerName: z.string().optional(),
  locationId: z.string().uuid().optional(),
  locationName: z.string().optional(),
  room: z.string().max(50).optional(),

  // Details
  reason: z.string().max(500).optional(),
  chiefComplaint: z.string().max(500).optional(),
  patientInstructions: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),

  // Check-in tracking
  checkInTime: DateTimeSchema.optional(),
  inRoomTime: DateTimeSchema.optional(),
  checkoutTime: DateTimeSchema.optional(),

  // Cancellation
  cancelledBy: z.string().uuid().optional(),
  cancelledDatetime: DateTimeSchema.optional(),
  cancellationReason: z.string().max(500).optional(),

  // Reminders
  reminderSent: z.boolean(),
  reminderSentDatetime: DateTimeSchema.optional(),

  // Recurrence
  recurrenceRule: z.string().optional(),
  recurrenceParentId: z.string().uuid().optional(),

  // Audit fields
  createdAt: DateTimeSchema.optional(),
  createdBy: z.string().optional(),
  updatedAt: DateTimeSchema.optional(),
  updatedBy: z.string().optional(),

  // MUMPS data
  mumpsData: z.record(z.unknown()).optional(),
}).refine(
  // Business rule: scheduledEndDatetime must be after scheduledDatetime
  data => {
    const start = new Date(data.scheduledDatetime);
    const end = new Date(data.scheduledEndDatetime);
    return end > start;
  },
  {
    message: "Scheduled end time must be after start time",
    path: ["scheduledEndDatetime"],
  }
).refine(
  // Business rule: If cancelled, must have cancellation reason
  data => {
    if (data.status === "cancelled") {
      return !!data.cancellationReason;
    }
    return true;
  },
  {
    message: "Cancelled appointments must have a cancellation reason",
    path: ["cancellationReason"],
  }
).refine(
  // Business rule: If checked in, must have check-in time
  data => {
    if (["checked_in", "in_room", "completed"].includes(data.status)) {
      return !!data.checkInTime;
    }
    return true;
  },
  {
    message: "Check-in time required for checked-in appointments",
    path: ["checkInTime"],
  }
);

export type EhrAppointment = z.infer<typeof EhrAppointmentSchema>;

// Type guards
export const isEhrAppointment = createTypeGuard(EhrAppointmentSchema);

// Assertions
export const assertEhrAppointment = createAssertion(EhrAppointmentSchema, 'EhrAppointment');

// ============================================================================
// Create Appointment Request Schema
// ============================================================================

/**
 * Create appointment request validation
 */
export const CreateEhrAppointmentRequestSchema = z.object({
  patientId: z.string().uuid(),
  appointmentType: EhrAppointmentTypeSchema,
  scheduledDatetime: DateTimeSchema,
  durationMinutes: z.number().int().positive().optional(),
  providerId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
  chiefComplaint: z.string().max(500).optional(),
  patientInstructions: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  recurrenceRule: z.string().optional(),
});

export type CreateEhrAppointmentRequest = z.infer<typeof CreateEhrAppointmentRequestSchema>;

// Type guards
export const isCreateEhrAppointmentRequest = createTypeGuard(CreateEhrAppointmentRequestSchema);

// Assertions
export const assertCreateEhrAppointmentRequest = createAssertion(
  CreateEhrAppointmentRequestSchema,
  'CreateEhrAppointmentRequest'
);

// ============================================================================
// Update Appointment Request Schema
// ============================================================================

/**
 * Update appointment request validation
 */
export const UpdateEhrAppointmentRequestSchema = CreateEhrAppointmentRequestSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateEhrAppointmentRequest = z.infer<typeof UpdateEhrAppointmentRequestSchema>;

// Type guards
export const isUpdateEhrAppointmentRequest = createTypeGuard(UpdateEhrAppointmentRequestSchema);

// Assertions
export const assertUpdateEhrAppointmentRequest = createAssertion(
  UpdateEhrAppointmentRequestSchema,
  'UpdateEhrAppointmentRequest'
);

// ============================================================================
// Reschedule Appointment Request Schema
// ============================================================================

/**
 * Reschedule appointment request validation
 */
export const RescheduleEhrAppointmentRequestSchema = z.object({
  id: z.string().uuid(),
  newDatetime: DateTimeSchema,
  reason: z.string().max(500).optional(),
});

export type RescheduleEhrAppointmentRequest = z.infer<typeof RescheduleEhrAppointmentRequestSchema>;

// Type guards
export const isRescheduleEhrAppointmentRequest = createTypeGuard(RescheduleEhrAppointmentRequestSchema);

// Assertions
export const assertRescheduleEhrAppointmentRequest = createAssertion(
  RescheduleEhrAppointmentRequestSchema,
  'RescheduleEhrAppointmentRequest'
);

// ============================================================================
// Cancel Appointment Request Schema
// ============================================================================

/**
 * Cancel appointment request validation
 */
export const CancelEhrAppointmentRequestSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, { message: "Cancellation reason is required" }).max(500),
});

export type CancelEhrAppointmentRequest = z.infer<typeof CancelEhrAppointmentRequestSchema>;

// Type guards
export const isCancelEhrAppointmentRequest = createTypeGuard(CancelEhrAppointmentRequestSchema);

// Assertions
export const assertCancelEhrAppointmentRequest = createAssertion(
  CancelEhrAppointmentRequestSchema,
  'CancelEhrAppointmentRequest'
);

// ============================================================================
// Appointment Search Criteria Schema
// ============================================================================

/**
 * Appointment search criteria validation
 */
export const EhrAppointmentSearchCriteriaSchema = z.object({
  patientId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  appointmentType: EhrAppointmentTypeSchema.optional(),
  status: EhrAppointmentStatusSchema.optional(),
  dateFrom: DateTimeSchema.optional(),
  dateTo: DateTimeSchema.optional(),
  date: DateTimeSchema.optional(),
});

export type EhrAppointmentSearchCriteria = z.infer<typeof EhrAppointmentSearchCriteriaSchema>;

// Type guards
export const isEhrAppointmentSearchCriteria = createTypeGuard(EhrAppointmentSearchCriteriaSchema);

// ============================================================================
// Time Slot Schema
// ============================================================================

/**
 * Schedule view time slot validation
 */
export const EhrTimeSlotSchema = z.object({
  start: DateTimeSchema,
  end: DateTimeSchema,
  available: z.boolean(),
  appointment: EhrAppointmentSchema.optional(),
}).refine(
  // Business rule: end must be after start
  data => new Date(data.end) > new Date(data.start),
  {
    message: "End time must be after start time",
    path: ["end"],
  }
);

export type EhrTimeSlot = z.infer<typeof EhrTimeSlotSchema>;

// Type guards
export const isEhrTimeSlot = createTypeGuard(EhrTimeSlotSchema);

// ============================================================================
// Provider Schedule Schema
// ============================================================================

/**
 * Provider schedule for a day validation
 */
export const EhrProviderScheduleSchema = z.object({
  providerId: z.string().uuid(),
  providerName: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" }),
  slots: z.array(EhrTimeSlotSchema),
});

export type EhrProviderSchedule = z.infer<typeof EhrProviderScheduleSchema>;

// Type guards
export const isEhrProviderSchedule = createTypeGuard(EhrProviderScheduleSchema);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate appointment end time based on start time and duration
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return end.toISOString();
}

/**
 * Get default duration for appointment type
 */
export function getDefaultDuration(appointmentType: EhrAppointmentType): number {
  return APPOINTMENT_DURATIONS[appointmentType];
}

/**
 * Check if appointment is in the past
 */
export function isAppointmentPast(appointment: EhrAppointment): boolean {
  return new Date(appointment.scheduledDatetime) < new Date();
}

/**
 * Check if appointment is today
 */
export function isAppointmentToday(appointment: EhrAppointment): boolean {
  const today = new Date();
  const apptDate = new Date(appointment.scheduledDatetime);
  return (
    apptDate.getFullYear() === today.getFullYear() &&
    apptDate.getMonth() === today.getMonth() &&
    apptDate.getDate() === today.getDate()
  );
}

/**
 * Check if appointment can be cancelled
 */
export function canCancelAppointment(appointment: EhrAppointment): boolean {
  return !["completed", "cancelled", "no_show"].includes(appointment.status);
}

/**
 * Check if appointment can be rescheduled
 */
export function canRescheduleAppointment(appointment: EhrAppointment): boolean {
  return !["completed", "cancelled"].includes(appointment.status);
}

/**
 * EHR Appointment types
 * Corresponds to VistA File #44 (^SD)
 */

import type { EhrAuditFields } from "./common";

/** Appointment status */
export type EhrAppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_room"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

/** Appointment type */
export type EhrAppointmentType =
  | "new_patient"
  | "follow_up"
  | "annual_exam"
  | "urgent"
  | "telehealth"
  | "procedure"
  | "lab"
  | "other";

/** Appointment type display names */
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

/** Default durations in minutes */
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

/** EHR Appointment entity */
export interface EhrAppointment extends EhrAuditFields {
  id: string;
  ien: number;
  organizationId: string;
  patientId: string;
  visitId?: string;

  appointmentType: EhrAppointmentType;
  status: EhrAppointmentStatus;

  scheduledDatetime: string;
  durationMinutes: number;
  scheduledEndDatetime: string;

  providerId?: string;
  providerName?: string;
  locationId?: string;
  locationName?: string;
  room?: string;

  reason?: string;
  chiefComplaint?: string;
  patientInstructions?: string;
  notes?: string;

  checkInTime?: string;
  inRoomTime?: string;
  checkoutTime?: string;

  cancelledBy?: string;
  cancelledDatetime?: string;
  cancellationReason?: string;

  reminderSent: boolean;
  reminderSentDatetime?: string;

  recurrenceRule?: string;
  recurrenceParentId?: string;

  mumpsData?: Record<string, unknown>;
}

/** Appointment creation request */
export interface CreateEhrAppointmentRequest {
  patientId: string;
  appointmentType: EhrAppointmentType;
  scheduledDatetime: string;
  durationMinutes?: number;
  providerId?: string;
  locationId?: string;
  reason?: string;
  chiefComplaint?: string;
  patientInstructions?: string;
  notes?: string;
  recurrenceRule?: string;
}

/** Appointment update request */
export interface UpdateEhrAppointmentRequest extends Partial<CreateEhrAppointmentRequest> {
  id: string;
}

/** Appointment reschedule request */
export interface RescheduleEhrAppointmentRequest {
  id: string;
  newDatetime: string;
  reason?: string;
}

/** Appointment cancel request */
export interface CancelEhrAppointmentRequest {
  id: string;
  reason?: string;
}

/** Appointment search criteria */
export interface EhrAppointmentSearchCriteria {
  patientId?: string;
  providerId?: string;
  locationId?: string;
  appointmentType?: EhrAppointmentType;
  status?: EhrAppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
  date?: string;
}

/** Schedule view time slot */
export interface EhrTimeSlot {
  start: string;
  end: string;
  available: boolean;
  appointment?: EhrAppointment;
}

/** Provider schedule for a day */
export interface EhrProviderSchedule {
  providerId: string;
  providerName: string;
  date: string;
  slots: EhrTimeSlot[];
}

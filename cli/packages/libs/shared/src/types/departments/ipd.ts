/**
 * IPD Types
 * In-Patient Department admission and discharge management
 */

import type { BedType } from "./bed";
import type { WardSpecialty } from "./ward";

/** Admission status */
export type AdmissionStatus =
  | "pending" // Awaiting bed assignment
  | "admitted" // Currently admitted
  | "transferred" // Transferred to another ward/facility
  | "discharged" // Normal discharge
  | "absconded" // Left without discharge
  | "expired" // Death
  | "lama"; // Left Against Medical Advice

/** Admission type */
export type AdmissionType =
  | "emergency"
  | "elective"
  | "transfer_in"
  | "observation"
  | "daycare"
  | "maternity"
  | "surgical"
  | "other";

/** Discharge type */
export type DischargeType =
  | "normal"
  | "against_advice" // LAMA
  | "transfer"
  | "death"
  | "absconded"
  | "other";

/** Patient admission record */
export interface Admission {
  id: string;
  admissionNumber: string;

  // Patient info
  patientId: string;
  patientName: string;
  patientMrn?: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Admission details
  admissionType: AdmissionType;
  admissionDate: string;
  admissionTime: string;
  admittingDoctorId: string;
  admittingDoctorName?: string;
  attendingDoctorId?: string;
  attendingDoctorName?: string;
  referringDoctorName?: string;
  referralSource?: string;

  // Ward/Bed
  wardId: string;
  wardName?: string;
  wardSpecialty?: WardSpecialty;
  bedId: string;
  bedCode?: string;
  bedType?: BedType;
  roomNumber?: string;

  // Clinical
  primaryDiagnosis?: string;
  diagnosisCodes?: string[]; // ICD-10
  chiefComplaint?: string;
  admissionNotes?: string;
  allergies?: string[];
  dietaryRestrictions?: string[];

  // Expected dates
  expectedDischargeDate?: string;
  expectedLengthOfStay?: number; // days

  // Actual discharge
  dischargeDate?: string;
  dischargeTime?: string;
  dischargeType?: DischargeType;
  dischargingDoctorId?: string;
  dischargingDoctorName?: string;
  dischargeSummary?: string;
  dischargeNotes?: string;
  followUpDate?: string;
  followUpInstructions?: string;

  // Financial
  estimatedCost?: number;
  currencyCode?: string;
  insurancePolicyId?: string;
  insuranceApprovalStatus?: "pending" | "approved" | "rejected" | "na";
  depositAmount?: number;

  // Status
  status: AdmissionStatus;
  lengthOfStay?: number; // actual days

  createdAt: string;
  updatedAt: string;
}

/** Admission summary for lists */
export interface AdmissionSummary {
  id: string;
  admissionNumber: string;
  patientName: string;
  patientMrn?: string;
  patientAge?: number;
  patientGender?: string;
  admissionDate: string;
  wardName: string;
  bedCode: string;
  roomNumber?: string;
  attendingDoctorName?: string;
  primaryDiagnosis?: string;
  status: AdmissionStatus;
  lengthOfStay: number;
  expectedDischargeDate?: string;
}

/** Create admission request */
export interface CreateAdmissionRequest {
  patientId: string;
  admissionType: AdmissionType;
  admittingDoctorId: string;
  attendingDoctorId?: string;
  referringDoctorName?: string;
  referralSource?: string;
  wardId: string;
  bedId: string;
  primaryDiagnosis?: string;
  diagnosisCodes?: string[];
  chiefComplaint?: string;
  admissionNotes?: string;
  expectedDischargeDate?: string;
  expectedLOS?: number; // Expected length of stay in days
  estimatedCost?: number;
  currencyCode?: string;
  insurancePolicyId?: string;
  depositAmount?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

/** Discharge request */
export interface DischargeRequest {
  dischargeType: DischargeType;
  dischargingDoctorId: string;
  dischargeSummary?: string;
  dischargeNotes?: string;
  finalDiagnosis?: string;
  finalDiagnosisCodes?: string[];
  followUpDate?: string;
  followUpInstructions?: string;
  medicationsOnDischarge?: string[];
}

/** Transfer request (within hospital) */
export interface TransferRequest {
  toWardId: string;
  toBedId: string;
  reason: string;
  transferringDoctorId: string;
  notes?: string;
}

/** Ward transfer record */
export interface WardTransfer {
  id: string;
  admissionId: string;
  fromWardId: string;
  fromWardName: string;
  fromBedId: string;
  fromBedCode: string;
  toWardId: string;
  toWardName: string;
  toBedId: string;
  toBedCode: string;
  reason: string;
  transferredBy: string;
  transferredAt: string;
  notes?: string;
}

/** Admission list response */
export interface AdmissionListResponse {
  data: AdmissionSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/** IPD census */
export interface IPDCensus {
  totalAdmitted: number;
  admissionsToday: number;
  dischargesToday: number;
  expectedDischarges: number;
  byWard: {
    wardId: string;
    wardName: string;
    specialty: WardSpecialty;
    occupied: number;
    capacity: number;
    admissionsToday: number;
    dischargesToday: number;
  }[];
  byStatus: Record<AdmissionStatus, number>;
  averageLengthOfStay: number;
  asOf: string;
}

/** IPD dashboard statistics */
export interface IPDDashboardStats {
  census: IPDCensus;
  criticalPatients: AdmissionSummary[];
  pendingDischarges: AdmissionSummary[];
  longStayPatients: AdmissionSummary[]; // > 7 days
  recentAdmissions: AdmissionSummary[];
  recentDischarges: AdmissionSummary[];
  bedOccupancyTrend: {
    date: string;
    occupied: number;
    capacity: number;
  }[];

  // Convenience aliases from census
  currentAdmissions: number; // Alias for census.totalAdmitted
  todayAdmissions: number; // Alias for census.admissionsToday
  todayDischarges: number; // Alias for census.dischargesToday
  averageLOS: number; // Alias for census.averageLengthOfStay
}

/** Discharge summary document */
export interface DischargeSummaryDocument {
  admissionId: string;
  admissionNumber: string;
  patientName: string;
  patientMrn: string;
  patientAge: number;
  patientGender: string;
  admissionDate: string;
  dischargeDate: string;
  lengthOfStay: number;
  wardName: string;
  bedCode: string;
  attendingDoctorName: string;
  admissionDiagnosis: string;
  finalDiagnosis: string;
  diagnosisCodes: string[];
  procedures?: string[];
  hospitalCourse?: string;
  conditionAtDischarge?: string;
  medicationsOnDischarge: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  followUpInstructions?: string;
  followUpDate?: string;
  dietaryAdvice?: string;
  activityRestrictions?: string;
  warningSignsToWatch?: string[];
  emergencyContact?: string;
  generatedAt: string;
}

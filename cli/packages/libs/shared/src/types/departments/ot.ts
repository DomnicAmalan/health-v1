/**
 * OT Types
 * Operating Theatre management and surgery scheduling
 */

/** OT specialty */
export type OTSpecialty =
  | "general"
  | "cardiac"
  | "orthopedic"
  | "neuro"
  | "ent"
  | "ophthalmic"
  | "urology"
  | "gynecology"
  | "obstetrics"
  | "pediatric"
  | "plastic"
  | "vascular"
  | "dental"
  | "emergency"
  | "minor"
  | "other";

/** OT status */
export type OTStatus =
  | "available"
  | "preparing"
  | "in_use"
  | "cleaning"
  | "maintenance"
  | "closed";

/** Surgery status */
export type SurgeryStatus =
  | "scheduled"
  | "pre_op"
  | "anesthesia"
  | "in_progress"
  | "closing"
  | "post_op"
  | "completed"
  | "cancelled"
  | "postponed";

/** Surgery priority */
export type SurgeryPriority =
  | "elective"
  | "urgent"
  | "emergency"
  | "immediate"; // Life-threatening

/** Anesthesia type */
export type AnesthesiaType =
  | "general"
  | "regional"
  | "spinal"
  | "epidural"
  | "local"
  | "sedation"
  | "topical"
  | "none";

/** Operating Theatre */
export interface OperatingTheatre {
  id: string;
  otCode: string;
  otName: string;
  specialty: OTSpecialty;
  status: OTStatus;

  // Capabilities
  hasLaminarFlow: boolean;
  hasCArm: boolean;
  hasLaparoscopy: boolean;
  hasRobotics: boolean;
  hasCardiacBypass: boolean;
  additionalEquipment?: string[];

  // Location
  building?: string;
  floor?: string;

  // Scheduling
  defaultStartTime?: string; // e.g., "08:00"
  defaultEndTime?: string; // e.g., "18:00"
  isEmergencyCapable: boolean;

  // Current state
  currentSurgeryId?: string;
  currentPatientName?: string;
  currentProcedure?: string;
  expectedEndTime?: string;
  nextSurgeryId?: string;

  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Surgery schedule */
export interface Surgery {
  id: string;
  surgeryNumber: string;

  // Patient
  patientId: string;
  patientName: string;
  patientMrn?: string;
  patientAge?: number;
  patientGender?: string;
  admissionId?: string;

  // OT assignment
  otId: string;
  otCode?: string;
  otName?: string;

  // Procedure
  procedureName: string;
  procedureCode?: string; // CPT or local code
  diagnosisCodes?: string[]; // ICD-10
  specialty: OTSpecialty;
  priority: SurgeryPriority;
  estimatedDuration: number; // minutes
  anesthesiaType: AnesthesiaType;

  // Team
  primarySurgeonId: string;
  primarySurgeonName?: string;
  leadSurgeonName?: string; // Alias for primarySurgeonName
  assistantSurgeonIds?: string[];
  assistantSurgeonNames?: string[];
  anesthetistId: string;
  anesthetistName?: string;
  nursingTeam?: string[];

  // Scheduling
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;

  // Actual times
  actualStartTime?: string;
  actualEndTime?: string;
  anesthesiaStartTime?: string;
  anesthesiaEndTime?: string;
  incisionTime?: string;
  closureTime?: string;

  // Status
  status: SurgeryStatus;
  statusUpdatedAt?: string;

  // Pre-op
  preOpChecklistComplete: boolean;
  preOpNotes?: string;
  preOpClearance?: boolean;
  consentSigned: boolean;
  bloodGroupConfirmed: boolean;
  bloodUnitsReserved?: number;
  specialInstructions?: string;

  // Intra-op
  intraOpNotes?: string;
  complications?: string[];
  bloodLoss?: number; // ml
  bloodTransfused?: number; // units

  // Post-op
  postOpNotes?: string;
  postOpDestination?: "ward" | "icu" | "recovery" | "home";
  postOpBedId?: string;
  recoveryNotes?: string;

  // Billing
  estimatedCost?: number;
  currencyCode?: string;
  insurancePreAuthId?: string;

  createdAt: string;
  updatedAt: string;
}

/** Surgery summary for lists */
export interface SurgerySummary {
  id: string;
  surgeryNumber: string;
  patientName: string;
  patientMrn?: string;
  procedureName: string;
  otName: string;
  primarySurgeonName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDuration: number;
  status: SurgeryStatus;
  priority: SurgeryPriority;
}

/** Schedule surgery request */
export interface ScheduleSurgeryRequest {
  patientId: string;
  admissionId?: string;
  otId: string;
  procedureName: string;
  procedureCode?: string;
  diagnosisCodes?: string[];
  specialty: OTSpecialty;
  priority: SurgeryPriority;
  estimatedDuration: number;
  anesthesiaType: AnesthesiaType;
  primarySurgeonId: string;
  leadSurgeonId?: string; // Alias for primarySurgeonId
  assistantSurgeonIds?: string[];
  anesthetistId: string;
  nursingTeam?: string[];
  scheduledDate: string;
  scheduledStartTime: string;
  preOpNotes?: string;
  specialInstructions?: string;
  bloodUnitsReserved?: number;
  estimatedCost?: number;
  currencyCode?: string;
  insurancePreAuthId?: string;
}

/** Update surgery status request */
export interface UpdateSurgeryStatusRequest {
  status: SurgeryStatus;
  notes?: string;
  complications?: string[];
  bloodLoss?: number;
  bloodTransfused?: number;
}

/** Complete surgery request */
export interface CompleteSurgeryRequest {
  actualEndTime?: string;
  intraOpNotes?: string;
  postOpNotes?: string;
  complications?: string[];
  bloodLoss?: number;
  bloodTransfused?: number;
  postOpDestination: "ward" | "icu" | "recovery" | "home";
  postOpBedId?: string;
  recoveryNotes?: string;
  outcome?: string; // Surgery outcome/result
}

/** Reschedule surgery request */
export interface RescheduleSurgeryRequest {
  newDate: string;
  newStartTime: string;
  newOtId?: string;
  reason: string;
}

/** OT list response */
export interface OTListResponse {
  data: OperatingTheatre[];
  theatres: OperatingTheatre[]; // Alias for data
  total: number;
}

/** Surgery list response */
export interface SurgeryListResponse {
  data: SurgerySummary[];
  surgeries: SurgerySummary[]; // Alias for data
  total: number;
  page: number;
  pageSize: number;
}

/** OT availability slot */
export interface OTSlot {
  otId: string;
  otCode: string;
  otName: string;
  specialty: OTSpecialty;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isAvailable: boolean;
  conflictingSurgeryId?: string;
}

/** OT availability response */
export interface OTAvailabilityResponse {
  date: string;
  slots: OTSlot[];
}

/** OT dashboard statistics */
export interface OTDashboardStats {
  today: {
    totalScheduled: number;
    completed: number;
    inProgress: number;
    cancelled: number;
    emergencies: number;
    averageDuration: number; // minutes
    utilization: number; // percentage
  };
  byOT: {
    otId: string;
    otCode: string;
    otName: string;
    status: OTStatus;
    todaySurgeries: number;
    currentSurgery?: string;
    nextSurgery?: SurgerySummary;
    utilizationToday: number;
  }[];
  bySurgeon: {
    surgeonId: string;
    surgeonName: string;
    todaySurgeries: number;
    completedToday: number;
  }[];
  upcomingSurgeries: SurgerySummary[];
  recentlyCompleted: SurgerySummary[];
  asOf: string;

  // Convenience aliases for top-level access
  totalTheatres: number; // Total number of OTs
  availableTheatres: number; // Number of available OTs
  todaySurgeries: number; // Alias for today.totalScheduled
  inProgress: number; // Alias for today.inProgress
  completed: number; // Alias for today.completed
}

/** OT schedule board (for display) */
export interface OTScheduleBoard {
  date: string;
  theatres: {
    otId: string;
    otCode: string;
    otName: string;
    status: OTStatus;
    schedule: {
      surgeryId: string;
      patientName: string;
      procedureName: string;
      surgeonName: string;
      startTime: string;
      endTime: string;
      status: SurgeryStatus;
    }[];
  }[];
  lastUpdated: string;
}

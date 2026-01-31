/**
 * OPD Types
 * Out-Patient Department queue and consultation management
 */

/** OPD queue status */
export type QueueStatus =
  | "waiting"
  | "called"
  | "in_consultation"
  | "completed"
  | "cancelled"
  | "no_show"
  | "referred"
  | "skipped";

/** OPD queue priority */
export type QueuePriority =
  | "normal"
  | "priority" // VIP, elderly, pregnant
  | "urgent"
  | "emergency";

/** OPD visit type */
export type OPDVisitType =
  | "new_patient"
  | "follow_up"
  | "walk_in"
  | "referral"
  | "emergency"
  | "review"
  | "procedure";

/** OPD queue entry */
export interface OPDQueueEntry {
  id: string;
  queueNumber: number;
  tokenNumber: string; // e.g., "OPD-001"

  // Patient info
  patientId: string;
  patientName: string;
  patientMrn?: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone?: string;

  // Visit details
  visitType: OPDVisitType;
  departmentId?: string;
  departmentName?: string;
  doctorId?: string;
  doctorName?: string;
  roomNumber?: string;
  appointmentId?: string;

  // Queue management
  status: QueueStatus;
  priority: QueuePriority;
  priorityReason?: string;

  // Timing
  checkInTime?: string; // Physical check-in time at registration desk
  registrationTime: string;
  estimatedWaitTime?: number; // minutes
  actualWaitTime?: number; // minutes
  calledTime?: string;
  consultationStartTime?: string;
  consultationEndTime?: string;

  // Additional
  chiefComplaint?: string;
  vitalsRecorded: boolean;
  paymentStatus?: "pending" | "paid" | "insurance" | "waived";
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

/** OPD queue summary for display */
export interface OPDQueueSummary {
  id: string;
  tokenNumber: string;
  queueNumber: number;
  patientId: string;
  patientName: string;
  patientMrn?: string;
  doctorName?: string;
  status: QueueStatus;
  priority: QueuePriority;
  waitTime: number; // minutes since registration
  estimatedWaitTime?: number;
  registrationTime: string;
}

/** OPD check-in request */
export interface OPDCheckInRequest {
  patientId: string;
  visitType: OPDVisitType;
  departmentId?: string;
  doctorId?: string;
  appointmentId?: string;
  priority?: QueuePriority;
  priorityReason?: string;
  chiefComplaint?: string;
  notes?: string;
}

/** OPD check-in response */
export interface OPDCheckInResponse {
  queueEntry: OPDQueueEntry;
  tokenNumber: string;
  estimatedWaitTime: number;
  queuePosition: number;
  message: string;
}

/** Call next patient request */
export interface CallNextRequest {
  doctorId: string;
  roomNumber?: string;
  skipPatientIds?: string[]; // patients to skip
}

/** Update queue status request */
export interface UpdateQueueStatusRequest {
  status: QueueStatus;
  reason?: string;
  notes?: string;
}

/** OPD queue list response */
export interface OPDQueueListResponse {
  queue: OPDQueueSummary[];
  total: number;
  waiting: number;
  inConsultation: number;
  completed: number;
  averageWaitTime: number;
}

/** OPD dashboard statistics */
export interface OPDDashboardStats {
  today: {
    totalRegistered: number;
    waiting: number;
    inConsultation: number;
    completed: number;
    cancelled: number;
    noShow: number;
    averageWaitTime: number; // minutes
    averageConsultationTime: number; // minutes
  };
  byDepartment: {
    departmentId: string;
    departmentName: string;
    waiting: number;
    inConsultation: number;
    completed: number;
    averageWaitTime: number;
  }[];
  byDoctor: {
    doctorId: string;
    doctorName: string;
    waiting: number;
    completed: number;
    averageConsultationTime: number;
  }[];
  hourlyDistribution: {
    hour: number;
    registrations: number;
    completions: number;
  }[];
  asOf: string;
}

/** Doctor's current queue */
export interface DoctorQueueView {
  doctorId: string;
  doctorName: string;
  roomNumber?: string;
  currentPatient?: OPDQueueSummary;
  nextPatients: OPDQueueSummary[];
  waitingCount: number;
  completedToday: number;
  averageConsultationTime: number;
}

/** OPD room status */
export interface OPDRoomStatus {
  roomNumber: string;
  doctorId?: string;
  doctorName?: string;
  departmentName?: string;
  currentPatientToken?: string;
  currentPatientName?: string;
  status: "available" | "occupied" | "break" | "closed";
  queueLength: number;
  nextPatientToken?: string;
}

/** OPD display board data (for waiting room screens) */
export interface OPDDisplayBoard {
  rooms: OPDRoomStatus[];
  recentlyCalled: {
    tokenNumber: string;
    patientName: string;
    roomNumber: string;
    calledAt: string;
  }[];
  announcements?: string[];
  lastUpdated: string;
}

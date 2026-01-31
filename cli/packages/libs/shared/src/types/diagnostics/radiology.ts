/**
 * Radiology Types
 * Types for Radiology Information System (RIS)
 */

// Modality types
export type Modality =
  | "xray"
  | "ct"
  | "mri"
  | "ultrasound"
  | "mammography"
  | "fluoroscopy"
  | "nuclear"
  | "pet"
  | "angiography"
  | "dexa"
  | "other";

// Body part
export type BodyPart =
  | "head"
  | "neck"
  | "chest"
  | "abdomen"
  | "pelvis"
  | "spine"
  | "upper_extremity"
  | "lower_extremity"
  | "whole_body"
  | "other";

// Laterality
export type Laterality = "left" | "right" | "bilateral" | "not_applicable";

// Exam status
export type ExamStatus =
  | "scheduled"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "reported"
  | "verified"
  | "cancelled";

// Report status
export type ReportStatus =
  | "pending"
  | "preliminary"
  | "final"
  | "addendum"
  | "corrected";

// Urgency
export type ExamUrgency = "routine" | "urgent" | "stat" | "asap";
export type Urgency = ExamUrgency; // Alias for convenience

/**
 * Radiology Exam Type (from catalog)
 */
export interface RadiologyExamType {
  id: string;
  examCode: string;
  examName: string;
  modality: Modality;
  bodyPart: BodyPart;
  description?: string;
  cptCode?: string;
  defaultDuration: number; // in minutes
  requiresContrast: boolean;
  contrastType?: string;
  preparationInstructions?: string;
  contraindications?: string[];
  price?: number;
  currencyCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Radiology Room/Equipment
 */
export interface RadiologyRoom {
  id: string;
  roomCode: string;
  roomName: string;
  modality: Modality;
  location?: string;
  status: "available" | "in_use" | "maintenance" | "offline";
  equipmentModel?: string;
  equipmentSerial?: string;
  dicomAETitle?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Radiology Order
 */
export interface RadiologyOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientMRN?: string;
  patientDOB?: string;
  encounterId?: string;
  orderingDoctorId: string;
  orderingDoctorName: string;
  orderDate: string;
  urgency: ExamUrgency;
  status: "ordered" | "scheduled" | "in_progress" | "completed" | "cancelled";
  clinicalHistory?: string;
  diagnosis?: string;
  reasonForExam?: string;
  exams: RadiologyOrderExam[];
  examTypeIds?: string[]; // Convenience property - array of exam type IDs from exams
  totalAmount?: number;
  currencyCode?: string;
  isPaid: boolean;
  specialInstructions?: string;
  transportRequired: boolean;
  isolationRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Radiology Order Exam
 */
export interface RadiologyOrderExam {
  id: string;
  orderId: string;
  examTypeId: string;
  examCode: string;
  examName: string;
  modality: Modality;
  bodyPart: BodyPart;
  laterality?: Laterality;
  status: ExamStatus;
  scheduledDate?: string;
  scheduledRoomId?: string;
  scheduledRoomName?: string;
  price?: number;
  currencyCode?: string;
  examId?: string;
}

/**
 * Radiology Exam (actual exam performed)
 */
export interface RadiologyExam {
  id: string;
  examNumber: string;
  orderId: string;
  orderNumber: string;
  orderExamId: string;
  examTypeId: string;
  examCode: string;
  examName: string;
  modality: Modality;
  bodyPart: BodyPart;
  laterality?: Laterality;
  patientId: string;
  patientName: string;
  patientMRN?: string;
  status: ExamStatus;
  scheduledDate: string;
  scheduledTime?: string; // Scheduled time (if different from scheduledDate)
  roomId?: string;
  roomName?: string;
  technicianId?: string;
  technicianName?: string;
  startTime?: string;
  startedAt?: string; // When exam was actually started
  endTime?: string;
  completedAt?: string; // When exam was completed
  urgency?: ExamUrgency; // Urgency level
  clinicalHistory?: string; // Clinical history for the exam
  contrastUsed: boolean;
  contrastType?: string;
  contrastAmount?: number;
  contrastUnit?: string;
  radiationDose?: number;
  doseUnit?: string;
  numberOfImages?: number;
  studyInstanceUID?: string;
  accessionNumber?: string;
  notes?: string;
  reportId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Radiology Report
 */
export interface RadiologyReport {
  id: string;
  reportNumber: string;
  examId: string;
  examNumber: string;
  orderId: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  examName: string;
  modality: Modality;
  orderingDoctorName: string;
  examDate: string;
  reportDate: string;
  status: ReportStatus;
  radiologistId: string;
  radiologistName: string;
  findings: string;
  impression: string;
  recommendation?: string;
  comparisonStudies?: string;
  technique?: string;
  clinicalHistory?: string;
  isCritical: boolean;
  criticalNotified?: boolean;
  criticalNotifiedTo?: string;
  criticalNotifiedAt?: string;
  signedAt?: string;
  signedBy?: string; // ID or name of person who signed the report
  addendumTo?: string;
  addendumText?: string;
  transcribedBy?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Radiology Template (report template)
 */
export interface RadiologyTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  modality: Modality;
  bodyPart?: BodyPart;
  examTypeId?: string;
  findingsTemplate: string;
  impressionTemplate?: string;
  recommendationTemplate?: string;
  techniqueTemplate?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface RadiologyExamTypeListResponse {
  examTypes: RadiologyExamType[];
  total: number;
  page: number;
  limit: number;
}

export interface RadiologyRoomListResponse {
  rooms: RadiologyRoom[];
  total: number;
}

export interface RadiologyOrderListResponse {
  orders: RadiologyOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface RadiologyExamListResponse {
  exams: RadiologyExam[];
  total: number;
  page: number;
  limit: number;
}

export interface RadiologyReportListResponse {
  reports: RadiologyReport[];
  total: number;
  page: number;
  limit: number;
}

// Request types
export interface CreateRadiologyOrderRequest {
  patientId: string;
  encounterId?: string;
  orderingDoctorId: string;
  urgency: ExamUrgency;
  clinicalHistory?: string;
  diagnosis?: string;
  reasonForExam?: string;
  exams: {
    examTypeId: string;
    laterality?: Laterality;
  }[];
  specialInstructions?: string;
  transportRequired?: boolean;
  isolationRequired?: boolean;
}

export interface ScheduleExamRequest {
  orderExamId: string;
  scheduledDate: string;
  roomId: string;
}

export interface StartExamRequest {
  examId: string;
  technicianId: string;
  roomId?: string;
  notes?: string;
}

export interface CompleteExamRequest {
  examId: string;
  contrastUsed: boolean;
  contrastType?: string;
  contrastAmount?: number;
  contrastUnit?: string;
  radiationDose?: number;
  doseUnit?: string;
  numberOfImages?: number;
  studyInstanceUID?: string;
  notes?: string;
}

export interface CreateReportRequest {
  examId: string;
  findings: string;
  impression: string;
  recommendation?: string;
  comparisonStudies?: string;
  technique?: string;
  isCritical?: boolean;
}

export interface SignReportRequest {
  reportId: string;
}

export interface AddAddendumRequest {
  reportId: string;
  addendumText: string;
}

export interface NotifyCriticalFindingRequest {
  reportId: string;
  notifiedTo: string;
  notificationMethod: "phone" | "page" | "email" | "in_person";
  notes?: string;
}

// Dashboard stats
export interface RadiologyDashboardStats {
  pendingOrders: number;
  scheduledToday: number;
  inProgress: number;
  pendingReports: number;
  criticalFindings: number;
  completedToday: number;
  averageReportTAT: number; // in hours
  byModality: {
    modality: Modality;
    count: number;
  }[];
  byStatus: {
    status: string;
    count: number;
  }[];
  roomUtilization: {
    roomId: string;
    roomName: string;
    utilizationPercent: number;
  }[];

  // Additional aliases for convenience
  pendingScheduling: number; // Orders awaiting scheduling
  todayExams: number; // Exams scheduled for today
  examsCompletedToday: number; // Alias for completedToday
  reportsSignedToday: number; // Reports signed today
  availableRooms: number; // Number of available rooms
  totalRooms: number; // Total number of radiology rooms
}

// Worklist types
export interface RadiologyWorklist {
  type: "scheduling" | "technician" | "radiologist";
  items: RadiologyWorklistItem[];
  total: number;
}

export interface RadiologyWorklistItem {
  id: string;
  orderNumber: string;
  examNumber?: string;
  patientName: string;
  patientMRN?: string;
  examName: string;
  modality: Modality;
  urgency: ExamUrgency;
  scheduledDate?: string;
  roomName?: string;
  status: string;
  assignedTo?: string;
}

// Schedule types
export interface RadiologySchedule {
  date: string;
  rooms: RadiologyRoomSchedule[];
}

export interface RadiologyRoomSchedule {
  roomId: string;
  roomName: string;
  modality: Modality;
  slots: RadiologyScheduleSlot[];
}

export interface RadiologyScheduleSlot {
  startTime: string;
  endTime: string;
  examId?: string;
  examNumber?: string;
  patientName?: string;
  examName?: string;
  status: "available" | "booked" | "in_progress" | "completed" | "blocked";
}

/**
 * Clinical Dashboard Types
 * Types for clinical statistics and metrics
 */

// Time period for statistics
export type TimePeriod = "today" | "week" | "month" | "quarter" | "year" | "custom";

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Patient Census
export interface PatientCensus {
  totalPatients: number;
  inpatients: number;
  outpatients: number;
  emergencyPatients: number;
  icuPatients: number;
  dayCarePateints: number;
  newAdmissionsToday: number;
  dischargesToday: number;
  transfersToday: number;
  pendingDischarges: number;
}

export interface PatientCensusByDepartment {
  departmentId: string;
  departmentName: string;
  currentPatients: number;
  capacity: number;
  occupancyRate: number;
  admissionsToday: number;
  dischargesToday: number;
}

export interface PatientCensusTrend {
  date: string;
  inpatients: number;
  outpatients: number;
  emergency: number;
  total: number;
}

// Department Statistics
export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  totalVisits: number;
  uniquePatients: number;
  averageWaitTime: number; // minutes
  averageConsultationTime: number; // minutes
  patientsWaiting: number;
  patientsInConsultation: number;
  completedToday: number;
  cancelledToday: number;
  noShowToday: number;
}

export interface DepartmentPerformance {
  departmentId: string;
  departmentName: string;
  period: TimePeriod;
  totalVisits: number;
  revenue: number;
  averagePatientSatisfaction: number; // 1-5 scale
  averageTreatmentTime: number;
  readmissionRate: number;
  complicationRate: number;
}

// Clinical Metrics
export interface ClinicalMetrics {
  period: TimePeriod;
  totalEncounters: number;
  totalProcedures: number;
  totalDiagnoses: number;
  mortalityRate: number;
  readmissionRate: number;
  averageLengthOfStay: number; // days
  infectionRate: number;
  complicationRate: number;
}

// Turn Around Time (TAT) Metrics
export interface TATMetrics {
  labTAT: TATDetail;
  radiologyTAT: TATDetail;
  pharmacyTAT: TATDetail;
  emergencyTAT: TATDetail;
  admissionTAT: TATDetail;
  dischargeTAT: TATDetail;
}

export interface TATDetail {
  category: string;
  averageTime: number; // minutes
  targetTime: number; // minutes
  withinTarget: number; // percentage
  totalCases: number;
  breaches: number;
  trend: "improving" | "stable" | "declining";
}

export interface TATByPriority {
  priority: "routine" | "urgent" | "stat";
  averageTime: number;
  targetTime: number;
  withinTarget: number;
  count: number;
}

// Appointment Statistics
export interface AppointmentStats {
  totalScheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
  pending: number;
  averageWaitTime: number;
  slotUtilization: number; // percentage
}

export interface AppointmentsByType {
  type: string;
  count: number;
  percentage: number;
}

export interface AppointmentTrend {
  date: string;
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

// Vital Signs Summary
export interface VitalSignsSummary {
  abnormalCount: number;
  criticalCount: number;
  totalRecorded: number;
  byType: VitalSignTypeStats[];
}

export interface VitalSignTypeStats {
  type: string;
  totalCount: number;
  abnormalCount: number;
  criticalCount: number;
  averageValue?: number;
}

// Alerts and Notifications
export interface ClinicalAlert {
  id: string;
  type: "critical_result" | "drug_interaction" | "allergy" | "overdue_task" | "abnormal_vital";
  severity: "low" | "medium" | "high" | "critical";
  patientId: string;
  patientName: string;
  message: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// Dashboard Summary
export interface ClinicalDashboardSummary {
  census: PatientCensus;
  appointments: AppointmentStats;
  tatMetrics: TATMetrics;
  clinicalMetrics: ClinicalMetrics;
  alerts: ClinicalAlert[];
  departmentStats: DepartmentStats[];
  lastUpdated: string;
}

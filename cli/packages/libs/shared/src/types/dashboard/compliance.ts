/**
 * Compliance Dashboard Types
 * Types for audit, compliance, and regulatory reporting
 */

import type { TimePeriod } from "./clinical";

// Audit Trail Statistics
export interface AuditStats {
  period: TimePeriod;
  totalEvents: number;
  byAction: AuditByAction[];
  byEntity: AuditByEntity[];
  byUser: AuditByUser[];
  phiAccessCount: number;
  sensitiveDataAccess: number;
  failedAuthAttempts: number;
}

export interface AuditByAction {
  action: "create" | "read" | "update" | "delete" | "login" | "logout" | "export" | "print";
  count: number;
  percentage: number;
}

export interface AuditByEntity {
  entity: string;
  count: number;
  percentage: number;
}

export interface AuditByUser {
  userId: string;
  userName: string;
  role: string;
  eventCount: number;
  phiAccessCount: number;
  lastActivity: string;
}

export interface AuditTrend {
  date: string;
  totalEvents: number;
  phiAccess: number;
  securityEvents: number;
}

// PHI Access Reporting
export interface PHIAccessReport {
  period: TimePeriod;
  totalAccess: number;
  uniquePatients: number;
  uniqueUsers: number;
  byPurpose: PHIAccessByPurpose[];
  byUserRole: PHIAccessByRole[];
  suspiciousAccess: PHIAccessAlert[];
}

export interface PHIAccessByPurpose {
  purpose: "treatment" | "payment" | "operations" | "research" | "audit" | "other";
  count: number;
  percentage: number;
}

export interface PHIAccessByRole {
  role: string;
  accessCount: number;
  uniqueUsers: number;
  uniquePatients: number;
}

export interface PHIAccessAlert {
  id: string;
  userId: string;
  userName: string;
  patientId: string;
  patientName: string;
  accessType: string;
  reason: string;
  timestamp: string;
  flaggedReason: "unusual_hours" | "high_volume" | "unauthorized_access" | "break_glass" | "other";
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
}

// Compliance Status
export interface ComplianceOverview {
  overallScore: number; // 0-100
  byRegulation: ComplianceByRegulation[];
  openFindings: number;
  resolvedFindings: number;
  pendingActions: number;
  upcomingDeadlines: ComplianceDeadline[];
}

export interface ComplianceByRegulation {
  regulationId: string;
  regulationName: string;
  category: "privacy" | "security" | "safety" | "quality" | "financial" | "other";
  complianceScore: number;
  status: "compliant" | "partial" | "non_compliant" | "not_applicable";
  totalRequirements: number;
  metRequirements: number;
  pendingRequirements: number;
  lastAssessmentDate: string;
}

export interface ComplianceDeadline {
  id: string;
  regulationId: string;
  regulationName: string;
  requirement: string;
  dueDate: string;
  status: "pending" | "in_progress" | "overdue" | "completed";
  assignedTo: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface ComplianceFinding {
  id: string;
  regulationId: string;
  regulationName: string;
  finding: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "accepted_risk";
  identifiedDate: string;
  dueDate: string;
  resolvedDate?: string;
  assignedTo: string;
  remediation?: string;
}

// Training and Certification
export interface TrainingOverview {
  totalStaff: number;
  compliantStaff: number;
  pendingTraining: number;
  overdueTraining: number;
  complianceRate: number;
  byProgram: TrainingByProgram[];
  upcomingExpirations: TrainingExpiration[];
}

export interface TrainingByProgram {
  programId: string;
  programName: string;
  category: "compliance" | "clinical" | "safety" | "technical" | "other";
  requiredFor: string[];
  totalRequired: number;
  completed: number;
  inProgress: number;
  overdue: number;
  complianceRate: number;
}

export interface TrainingExpiration {
  userId: string;
  userName: string;
  role: string;
  programId: string;
  programName: string;
  expirationDate: string;
  daysUntilExpiration: number;
}

export interface TrainingCompletion {
  userId: string;
  userName: string;
  programId: string;
  programName: string;
  completedDate: string;
  score?: number;
  certificateId?: string;
  expirationDate?: string;
}

// Security Metrics
export interface SecurityMetrics {
  failedLoginAttempts: number;
  lockedAccounts: number;
  passwordResets: number;
  mfaAdoption: number;
  activesSessions: number;
  suspiciousActivities: number;
  securityIncidents: SecurityIncident[];
}

export interface SecurityIncident {
  id: string;
  type: "unauthorized_access" | "data_breach" | "malware" | "phishing" | "policy_violation" | "other";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "contained" | "resolved";
  description: string;
  reportedAt: string;
  resolvedAt?: string;
  affectedUsers?: number;
  affectedRecords?: number;
}

// Data Retention
export interface DataRetentionStats {
  totalRecords: number;
  recordsByAge: RecordsByAge[];
  pendingDeletion: number;
  archivedRecords: number;
  retentionCompliance: number;
}

export interface RecordsByAge {
  ageRange: string;
  count: number;
  percentage: number;
  retentionPolicy: string;
}

// Dashboard Summary
export interface ComplianceDashboardSummary {
  auditStats: AuditStats;
  phiAccessReport: PHIAccessReport;
  complianceOverview: ComplianceOverview;
  trainingOverview: TrainingOverview;
  securityMetrics: SecurityMetrics;
  dataRetentionStats: DataRetentionStats;
  recentFindings: ComplianceFinding[];
  recentAlerts: PHIAccessAlert[];
  lastUpdated: string;
}

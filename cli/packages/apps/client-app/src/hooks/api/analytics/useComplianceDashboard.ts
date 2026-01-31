/**
 * Compliance Dashboard Hooks
 * TanStack Query hooks for compliance, audit, and security analytics
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ROUTES } from "@lazarus-life/shared";
import { useApiClient } from "@/lib/api/client";
import type {
  TimePeriod,
  DateRange,
  AuditStats,
  AuditByAction,
  AuditByEntity,
  AuditByUser,
  AuditTrend,
  PHIAccessReport,
  PHIAccessByPurpose,
  PHIAccessByRole,
  PHIAccessAlert,
  ComplianceOverview,
  ComplianceByRegulation,
  ComplianceDeadline,
  ComplianceFinding,
  TrainingOverview,
  TrainingByProgram,
  TrainingExpiration,
  SecurityMetrics,
  SecurityIncident,
  DataRetentionStats,
  ComplianceDashboardSummary,
} from "@lazarus-life/shared";

// Query keys
export const complianceDashboardKeys = {
  all: ["compliance-dashboard"] as const,
  summary: () => [...complianceDashboardKeys.all, "summary"] as const,
  audit: () => [...complianceDashboardKeys.all, "audit"] as const,
  auditByAction: () => [...complianceDashboardKeys.all, "audit", "by-action"] as const,
  auditByEntity: () => [...complianceDashboardKeys.all, "audit", "by-entity"] as const,
  auditByUser: () => [...complianceDashboardKeys.all, "audit", "by-user"] as const,
  auditTrend: (period: TimePeriod) => [...complianceDashboardKeys.all, "audit", "trend", period] as const,
  phiAccess: () => [...complianceDashboardKeys.all, "phi-access"] as const,
  phiAccessByPurpose: () => [...complianceDashboardKeys.all, "phi-access", "by-purpose"] as const,
  phiAccessByRole: () => [...complianceDashboardKeys.all, "phi-access", "by-role"] as const,
  phiAlerts: () => [...complianceDashboardKeys.all, "phi-access", "alerts"] as const,
  complianceStatus: () => [...complianceDashboardKeys.all, "compliance", "status"] as const,
  complianceByRegulation: () => [...complianceDashboardKeys.all, "compliance", "by-regulation"] as const,
  complianceDeadlines: () => [...complianceDashboardKeys.all, "compliance", "deadlines"] as const,
  complianceFindings: () => [...complianceDashboardKeys.all, "compliance", "findings"] as const,
  training: () => [...complianceDashboardKeys.all, "training"] as const,
  trainingByProgram: () => [...complianceDashboardKeys.all, "training", "by-program"] as const,
  trainingExpirations: () => [...complianceDashboardKeys.all, "training", "expirations"] as const,
  security: () => [...complianceDashboardKeys.all, "security"] as const,
  securityIncidents: () => [...complianceDashboardKeys.all, "security", "incidents"] as const,
  dataRetention: () => [...complianceDashboardKeys.all, "data-retention"] as const,
};

// Summary
export function useComplianceDashboardSummary(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.summary(),
    queryFn: async () => {
      const response = await apiClient.get<ComplianceDashboardSummary>(API_ROUTES.ANALYTICS.COMPLIANCE.SUMMARY, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Audit Trail
export function useAuditStats(period?: TimePeriod, dateRange?: DateRange) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.audit(),
    queryFn: async () => {
      const response = await apiClient.get<AuditStats>(API_ROUTES.ANALYTICS.COMPLIANCE.AUDIT_STATS, {
        params: { period, ...dateRange },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useAuditByAction(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.auditByAction(),
    queryFn: async () => {
      const response = await apiClient.get<AuditByAction[]>(API_ROUTES.ANALYTICS.COMPLIANCE.AUDIT_BY_ACTION, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useAuditByEntity(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.auditByEntity(),
    queryFn: async () => {
      const response = await apiClient.get<AuditByEntity[]>(API_ROUTES.ANALYTICS.COMPLIANCE.AUDIT_BY_ENTITY, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useAuditByUser(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.auditByUser(),
    queryFn: async () => {
      const response = await apiClient.get<AuditByUser[]>(API_ROUTES.ANALYTICS.COMPLIANCE.AUDIT_BY_USER, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useAuditTrend(period: TimePeriod = "month") {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.auditTrend(period),
    queryFn: async () => {
      const response = await apiClient.get<AuditTrend[]>(API_ROUTES.ANALYTICS.COMPLIANCE.AUDIT_TREND, {
        params: { period },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useExportAuditLog(params: { period?: TimePeriod; dateRange?: DateRange; format?: string }) {
  const apiClient = useApiClient();
  return useMutation({
    mutationFn: () =>
      apiClient.get<Blob>(API_ROUTES.ANALYTICS.COMPLIANCE.AUDIT_EXPORT, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  });
}

// PHI Access
export function usePHIAccessReport(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.phiAccess(),
    queryFn: async () => {
      const response = await apiClient.get<PHIAccessReport>(API_ROUTES.ANALYTICS.COMPLIANCE.PHI_ACCESS, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function usePHIAccessByPurpose(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.phiAccessByPurpose(),
    queryFn: async () => {
      const response = await apiClient.get<PHIAccessByPurpose[]>(API_ROUTES.ANALYTICS.COMPLIANCE.PHI_ACCESS_BY_PURPOSE, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function usePHIAccessByRole(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.phiAccessByRole(),
    queryFn: async () => {
      const response = await apiClient.get<PHIAccessByRole[]>(API_ROUTES.ANALYTICS.COMPLIANCE.PHI_ACCESS_BY_ROLE, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function usePHIAlerts() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.phiAlerts(),
    queryFn: async () => {
      const response = await apiClient.get<PHIAccessAlert[]>(API_ROUTES.ANALYTICS.COMPLIANCE.PHI_ALERTS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useReviewPHIAlert() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) =>
      apiClient.post(API_ROUTES.ANALYTICS.COMPLIANCE.PHI_ALERT_REVIEW(alertId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceDashboardKeys.phiAlerts() });
    },
  });
}

// Compliance Status
export function useComplianceOverview() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.complianceStatus(),
    queryFn: async () => {
      const response = await apiClient.get<ComplianceOverview>(API_ROUTES.ANALYTICS.COMPLIANCE.COMPLIANCE_STATUS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useComplianceByRegulation() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.complianceByRegulation(),
    queryFn: async () => {
      const response = await apiClient.get<ComplianceByRegulation[]>(
        API_ROUTES.ANALYTICS.COMPLIANCE.COMPLIANCE_BY_REGULATION
      );
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useComplianceDeadlines() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.complianceDeadlines(),
    queryFn: async () => {
      const response = await apiClient.get<ComplianceDeadline[]>(API_ROUTES.ANALYTICS.COMPLIANCE.COMPLIANCE_DEADLINES);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useComplianceFindings() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.complianceFindings(),
    queryFn: async () => {
      const response = await apiClient.get<ComplianceFinding[]>(API_ROUTES.ANALYTICS.COMPLIANCE.COMPLIANCE_FINDINGS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useUpdateFinding() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; remediation?: string }) =>
      apiClient.patch(API_ROUTES.ANALYTICS.COMPLIANCE.FINDING_UPDATE(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceDashboardKeys.complianceFindings() });
    },
  });
}

// Training
export function useTrainingOverview() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.training(),
    queryFn: async () => {
      const response = await apiClient.get<TrainingOverview>(API_ROUTES.ANALYTICS.COMPLIANCE.TRAINING_OVERVIEW);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useTrainingByProgram() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.trainingByProgram(),
    queryFn: async () => {
      const response = await apiClient.get<TrainingByProgram[]>(API_ROUTES.ANALYTICS.COMPLIANCE.TRAINING_BY_PROGRAM);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useTrainingExpirations() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.trainingExpirations(),
    queryFn: async () => {
      const response = await apiClient.get<TrainingExpiration[]>(API_ROUTES.ANALYTICS.COMPLIANCE.TRAINING_EXPIRATIONS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Security
export function useSecurityMetrics() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.security(),
    queryFn: async () => {
      const response = await apiClient.get<SecurityMetrics>(API_ROUTES.ANALYTICS.COMPLIANCE.SECURITY_METRICS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useSecurityIncidents() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.securityIncidents(),
    queryFn: async () => {
      const response = await apiClient.get<SecurityIncident[]>(API_ROUTES.ANALYTICS.COMPLIANCE.SECURITY_INCIDENTS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Data Retention
export function useDataRetentionStats() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: complianceDashboardKeys.dataRetention(),
    queryFn: async () => {
      const response = await apiClient.get<DataRetentionStats>(API_ROUTES.ANALYTICS.COMPLIANCE.DATA_RETENTION);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

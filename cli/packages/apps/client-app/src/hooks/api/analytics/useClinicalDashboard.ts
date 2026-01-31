/**
 * Clinical Dashboard Hooks
 * TanStack Query hooks for clinical analytics and statistics
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ROUTES } from "@lazarus-life/shared";
import { useApiClient } from "@/lib/api/client";
import type {
  TimePeriod,
  DateRange,
  PatientCensus,
  PatientCensusByDepartment,
  PatientCensusTrend,
  DepartmentStats,
  DepartmentPerformance,
  TATMetrics,
  TATByPriority,
  AppointmentStats,
  AppointmentTrend,
  VitalSignsSummary,
  ClinicalAlert,
  ClinicalDashboardSummary,
} from "@lazarus-life/shared";

// Query keys
export const clinicalDashboardKeys = {
  all: ["clinical-dashboard"] as const,
  summary: () => [...clinicalDashboardKeys.all, "summary"] as const,
  census: () => [...clinicalDashboardKeys.all, "census"] as const,
  censusByDepartment: () => [...clinicalDashboardKeys.all, "census", "by-department"] as const,
  censusTrend: (period: TimePeriod) => [...clinicalDashboardKeys.all, "census", "trend", period] as const,
  departmentStats: () => [...clinicalDashboardKeys.all, "departments"] as const,
  departmentPerformance: (id: string) => [...clinicalDashboardKeys.all, "departments", id, "performance"] as const,
  tat: () => [...clinicalDashboardKeys.all, "tat"] as const,
  tatByPriority: () => [...clinicalDashboardKeys.all, "tat", "by-priority"] as const,
  appointments: () => [...clinicalDashboardKeys.all, "appointments"] as const,
  appointmentsTrend: (period: TimePeriod) => [...clinicalDashboardKeys.all, "appointments", "trend", period] as const,
  vitals: () => [...clinicalDashboardKeys.all, "vitals"] as const,
  alerts: () => [...clinicalDashboardKeys.all, "alerts"] as const,
};

// Summary
export function useClinicalDashboardSummary(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.summary(),
    queryFn: async () => {
      const response = await apiClient.get<ClinicalDashboardSummary>(API_ROUTES.ANALYTICS.CLINICAL.SUMMARY, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Census
export function usePatientCensus() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.census(),
    queryFn: async () => {
      const response = await apiClient.get<PatientCensus>(API_ROUTES.ANALYTICS.CLINICAL.CENSUS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function usePatientCensusByDepartment() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.censusByDepartment(),
    queryFn: async () => {
      const response = await apiClient.get<PatientCensusByDepartment[]>(API_ROUTES.ANALYTICS.CLINICAL.CENSUS_BY_DEPARTMENT);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function usePatientCensusTrend(period: TimePeriod = "week", dateRange?: DateRange) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.censusTrend(period),
    queryFn: async () => {
      const response = await apiClient.get<PatientCensusTrend[]>(API_ROUTES.ANALYTICS.CLINICAL.CENSUS_TREND, {
        params: { period, ...dateRange },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Department Stats
export function useDepartmentStats() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.departmentStats(),
    queryFn: async () => {
      const response = await apiClient.get<DepartmentStats[]>(API_ROUTES.ANALYTICS.CLINICAL.DEPARTMENT_STATS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useDepartmentPerformance(departmentId: string, period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.departmentPerformance(departmentId),
    queryFn: async () => {
      const response = await apiClient.get<DepartmentPerformance>(
        API_ROUTES.ANALYTICS.CLINICAL.DEPARTMENT_PERFORMANCE(departmentId),
        { params: period ? { period } : undefined }
      );
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
    enabled: !!departmentId,
  });
}

// TAT Metrics
export function useTATMetrics() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.tat(),
    queryFn: async () => {
      const response = await apiClient.get<TATMetrics>(API_ROUTES.ANALYTICS.CLINICAL.TAT_METRICS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useTATByPriority() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.tatByPriority(),
    queryFn: async () => {
      const response = await apiClient.get<TATByPriority[]>(API_ROUTES.ANALYTICS.CLINICAL.TAT_BY_PRIORITY);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Appointments
export function useAppointmentStats() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.appointments(),
    queryFn: async () => {
      const response = await apiClient.get<AppointmentStats>(API_ROUTES.ANALYTICS.CLINICAL.APPOINTMENTS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
    refetchInterval: 60000,
  });
}

export function useAppointmentsTrend(period: TimePeriod = "week") {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.appointmentsTrend(period),
    queryFn: async () => {
      const response = await apiClient.get<AppointmentTrend[]>(API_ROUTES.ANALYTICS.CLINICAL.APPOINTMENTS_TREND, {
        params: { period },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Vitals Summary
export function useVitalsSummary() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.vitals(),
    queryFn: async () => {
      const response = await apiClient.get<VitalSignsSummary>(API_ROUTES.ANALYTICS.CLINICAL.VITALS_SUMMARY);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Alerts
export function useClinicalAlerts() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: clinicalDashboardKeys.alerts(),
    queryFn: async () => {
      const response = await apiClient.get<ClinicalAlert[]>(API_ROUTES.ANALYTICS.CLINICAL.ALERTS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
    refetchInterval: 30000, // Refresh every 30 seconds for alerts
  });
}

export function useAcknowledgeAlert() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) =>
      apiClient.post(API_ROUTES.ANALYTICS.CLINICAL.ALERTS_ACKNOWLEDGE(alertId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicalDashboardKeys.alerts() });
    },
  });
}

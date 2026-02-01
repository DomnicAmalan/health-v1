/**
 * useEhrVitals Hook
 * TanStack Query hooks for EHR vital signs data
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/yottadb-client";
import type {
  EhrVital,
  EhrLatestVitals,
  EhrVitalType,
  CreateEhrVitalRequest,
  EhrPaginatedResponse,
  EhrPagination,
} from "@lazarus-life/shared/types/ehr";

export const EHR_VITAL_QUERY_KEYS = {
  all: ["ehr", "vitals"] as const,
  byPatient: (patientId: string) => [...EHR_VITAL_QUERY_KEYS.all, "patient", patientId] as const,
  byVisit: (visitId: string) => [...EHR_VITAL_QUERY_KEYS.all, "visit", visitId] as const,
  latest: (patientId: string) => [...EHR_VITAL_QUERY_KEYS.all, "latest", patientId] as const,
  trend: (patientId: string, vitalType: EhrVitalType) =>
    [...EHR_VITAL_QUERY_KEYS.all, "trend", patientId, vitalType] as const,
};

/**
 * Get vitals for a patient
 */
export function useEhrPatientVitals(patientId: string, pagination?: EhrPagination) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: [...EHR_VITAL_QUERY_KEYS.byPatient(patientId), pagination],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (pagination?.limit) queryParams.set("limit", String(pagination.limit));
      if (pagination?.offset) queryParams.set("offset", String(pagination.offset));

      const url = `${API_ROUTES.EHR.VITALS.BY_PATIENT(patientId)}?${queryParams.toString()}`;
      const response = await yottadbApiClient.get<EhrPaginatedResponse<EhrVital>>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_vitals", undefined, { action: "list_by_patient", patientId });
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get vitals for a visit
 */
export function useEhrVisitVitals(visitId: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_VITAL_QUERY_KEYS.byVisit(visitId),
    queryFn: async () => {
      const response = await yottadbApiClient.get<EhrVital[]>(API_ROUTES.EHR.VITALS.BY_VISIT(visitId));

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_vitals", undefined, { action: "list_by_visit", visitId });
      return response.data;
    },
    enabled: !!visitId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get latest vitals for a patient
 */
export function useEhrLatestVitals(patientId: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_VITAL_QUERY_KEYS.latest(patientId),
    queryFn: async () => {
      const response = await yottadbApiClient.get<EhrLatestVitals>(
        API_ROUTES.EHR.VITALS.LATEST(patientId)
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_vitals", undefined, { action: "view_latest", patientId });
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get vital trend for a patient
 */
export function useEhrVitalTrend(patientId: string, vitalType: EhrVitalType, limit = 10) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_VITAL_QUERY_KEYS.trend(patientId, vitalType),
    queryFn: async () => {
      const url = `${API_ROUTES.EHR.VITALS.TREND(patientId, vitalType)}?limit=${limit}`;
      const response = await yottadbApiClient.get<EhrVital[]>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_vitals", undefined, { action: "view_trend", patientId, vitalType });
      return response.data;
    },
    enabled: !!patientId && !!vitalType,
    staleTime: 60 * 1000,
  });
}

/**
 * Create vital mutation
 */
export function useCreateEhrVital() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (vital: CreateEhrVitalRequest) => {
      const response = await yottadbApiClient.post<EhrVital>(API_ROUTES.EHR.VITALS.CREATE, vital);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("CREATE", "ehr_vitals", response.data.id, { action: "create" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_VITAL_QUERY_KEYS.byPatient(data.patientId) });
      queryClient.invalidateQueries({ queryKey: EHR_VITAL_QUERY_KEYS.latest(data.patientId) });
      if (data.visitId) {
        queryClient.invalidateQueries({ queryKey: EHR_VITAL_QUERY_KEYS.byVisit(data.visitId) });
      }
    },
  });
}

/**
 * useEhrLabs Hook
 * TanStack Query hooks for EHR lab results data
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/yottadb-client";
import type {
  EhrLabResult,
  CreateEhrLabResultRequest,
  EhrPaginatedResponse,
  EhrPagination,
} from "@lazarus-life/shared/types/ehr";

export const EHR_LAB_QUERY_KEYS = {
  all: ["ehr", "labs"] as const,
  byPatient: (patientId: string) => [...EHR_LAB_QUERY_KEYS.all, "patient", patientId] as const,
  byVisit: (visitId: string) => [...EHR_LAB_QUERY_KEYS.all, "visit", visitId] as const,
  byOrder: (orderId: string) => [...EHR_LAB_QUERY_KEYS.all, "order", orderId] as const,
  detail: (id: string) => [...EHR_LAB_QUERY_KEYS.all, "detail", id] as const,
  actionable: () => [...EHR_LAB_QUERY_KEYS.all, "actionable"] as const,
};

/**
 * Get lab results for a patient
 */
export function useEhrPatientLabs(patientId: string, pagination?: EhrPagination) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: [...EHR_LAB_QUERY_KEYS.byPatient(patientId), pagination],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (pagination?.limit) queryParams.set("limit", String(pagination.limit));
      if (pagination?.offset) queryParams.set("offset", String(pagination.offset));

      const url = `${API_ROUTES.EHR.LABS.BY_PATIENT(patientId)}?${queryParams.toString()}`;
      const response = await yottadbApiClient.get<EhrPaginatedResponse<EhrLabResult>>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_labs", undefined, { action: "list_by_patient", patientId });
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get lab results for a visit
 */
export function useEhrVisitLabs(visitId: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_LAB_QUERY_KEYS.byVisit(visitId),
    queryFn: async () => {
      const response = await yottadbApiClient.get<EhrLabResult[]>(API_ROUTES.EHR.LABS.BY_VISIT(visitId));

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_labs", undefined, { action: "list_by_visit", visitId });
      return response.data;
    },
    enabled: !!visitId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get actionable labs (pending/abnormal)
 */
export function useEhrActionableLabs() {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_LAB_QUERY_KEYS.actionable(),
    queryFn: async () => {
      const response = await yottadbApiClient.get<EhrLabResult[]>(API_ROUTES.EHR.LABS.ACTIONABLE);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_labs", undefined, { action: "list_actionable" });
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

/**
 * Create lab result mutation
 */
export function useCreateEhrLabResult() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (labResult: CreateEhrLabResultRequest) => {
      const response = await yottadbApiClient.post<EhrLabResult>(API_ROUTES.EHR.LABS.CREATE, labResult);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("CREATE", "ehr_labs", response.data.id, { action: "create" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_LAB_QUERY_KEYS.byPatient(data.patientId) });
      if (data.visitId) {
        queryClient.invalidateQueries({ queryKey: EHR_LAB_QUERY_KEYS.byVisit(data.visitId) });
      }
      if (data.orderId) {
        queryClient.invalidateQueries({ queryKey: EHR_LAB_QUERY_KEYS.byOrder(data.orderId) });
      }
      queryClient.invalidateQueries({ queryKey: EHR_LAB_QUERY_KEYS.actionable() });
    },
  });
}

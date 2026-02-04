/**
 * useEhrVisits Hook
 * TanStack Query hooks for EHR visit/encounter data
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/yottadb-client";
import type {
  EhrVisit,
  EhrVisitSearchCriteria,
  CreateEhrVisitRequest,
  UpdateEhrVisitRequest,
  EhrPaginatedResponse,
  EhrPagination,
} from "@lazarus-life/shared/types/ehr";

import { createQueryKeyFactory, unwrapApiResponse, buildQueryParams } from "@lazarus-life/shared";

export const EHR_VISIT_QUERY_KEYS = {
  all: ["ehr", "visits"] as const,
  lists: () => [...EHR_VISIT_QUERY_KEYS.all, "list"] as const,
  list: (params?: EhrPagination & EhrVisitSearchCriteria) =>
    [...EHR_VISIT_QUERY_KEYS.lists(), params] as const,
  details: () => [...EHR_VISIT_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...EHR_VISIT_QUERY_KEYS.details(), id] as const,
  byPatient: (patientId: string) => [...EHR_VISIT_QUERY_KEYS.all, "patient", patientId] as const,
  today: () => [...EHR_VISIT_QUERY_KEYS.all, "today"] as const,
  active: () => [...EHR_VISIT_QUERY_KEYS.all, "active"] as const,
};

/**
 * Get visits for a patient
 */
export function useEhrPatientVisits(patientId: string, pagination?: EhrPagination) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_VISIT_QUERY_KEYS.byPatient(patientId),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (pagination?.limit) queryParams.set("limit", String(pagination.limit));
      if (pagination?.offset) queryParams.set("offset", String(pagination.offset));

      const url = `${API_ROUTES.EHR.VISITS.BY_PATIENT(patientId)}?${queryParams.toString()}`;
      const response = await apiClient.get<EhrPaginatedResponse<EhrVisit>>(url);

      const data = unwrapApiResponse(response);

      logPHI("ehr_visits", undefined, { action: "list_by_patient", patientId });
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get single visit by ID
 */
export function useEhrVisit(id: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_VISIT_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<EhrVisit>(API_ROUTES.EHR.VISITS.GET(id));

      const data = unwrapApiResponse(response);

      logPHI("ehr_visits", id, { action: "view" });
      return response.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Get today's visits
 */
export function useEhrTodayVisits() {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_VISIT_QUERY_KEYS.today(),
    queryFn: async () => {
      const response = await apiClient.get<EhrVisit[]>(API_ROUTES.EHR.VISITS.TODAY);

      const data = unwrapApiResponse(response);

      logPHI("ehr_visits", undefined, { action: "list_today" });
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Get active visits (checked-in or in-progress)
 */
export function useEhrActiveVisits() {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_VISIT_QUERY_KEYS.active(),
    queryFn: async () => {
      const response = await apiClient.get<EhrVisit[]>(API_ROUTES.EHR.VISITS.ACTIVE);

      const data = unwrapApiResponse(response);

      logPHI("ehr_visits", undefined, { action: "list_active" });
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Create visit mutation
 */
export function useCreateEhrVisit() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (visit: CreateEhrVisitRequest) => {
      const response = await apiClient.post<EhrVisit>(API_ROUTES.EHR.VISITS.CREATE, visit);

      const data = unwrapApiResponse(response);

      logState("CREATE", "ehr_visits", response.data.id, { action: "create" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.byPatient(data.patientId) });
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.today() });
    },
  });
}

/**
 * Update visit mutation
 */
export function useUpdateEhrVisit() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (visit: UpdateEhrVisitRequest) => {
      const { id, ...updates } = visit;
      const response = await apiClient.put<EhrVisit>(API_ROUTES.EHR.VISITS.UPDATE(id), updates);

      const data = unwrapApiResponse(response);

      logState("UPDATE", "ehr_visits", id, { action: "update" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.byPatient(data.patientId) });
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.today() });
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.active() });
    },
  });
}

/**
 * Check-in visit mutation
 */
export function useEhrVisitCheckIn() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<EhrVisit>(API_ROUTES.EHR.VISITS.CHECK_IN(id), {});

      const data = unwrapApiResponse(response);

      logState("UPDATE", "ehr_visits", id, { action: "check_in" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.today() });
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.active() });
    },
  });
}

/**
 * Check-out visit mutation
 */
export function useEhrVisitCheckOut() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, disposition }: { id: string; disposition?: string }) => {
      const response = await apiClient.post<EhrVisit>(API_ROUTES.EHR.VISITS.CHECK_OUT(id), {
        disposition,
      });

      const data = unwrapApiResponse(response);

      logState("UPDATE", "ehr_visits", id, { action: "check_out" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.today() });
      queryClient.invalidateQueries({ queryKey: EHR_VISIT_QUERY_KEYS.active() });
    },
  });
}

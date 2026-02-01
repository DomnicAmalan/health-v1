/**
 * useEhrPatients Hook
 * TanStack Query hooks for EHR patient data with PHI audit logging
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { yottadbApiClient } from "@/lib/api/yottadb-client";
import type {
  EhrPatient,
  EhrPatientBanner,
  EhrPatientSearchCriteria,
  CreateEhrPatientRequest,
  UpdateEhrPatientRequest,
  EhrPaginatedResponse,
  EhrPagination,
} from "@lazarus-life/shared/types/ehr";

export const EHR_PATIENT_QUERY_KEYS = {
  all: ["ehr", "patients"] as const,
  lists: () => [...EHR_PATIENT_QUERY_KEYS.all, "list"] as const,
  list: (params?: EhrPagination & EhrPatientSearchCriteria) =>
    [...EHR_PATIENT_QUERY_KEYS.lists(), params] as const,
  details: () => [...EHR_PATIENT_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...EHR_PATIENT_QUERY_KEYS.details(), id] as const,
  banner: (id: string) => [...EHR_PATIENT_QUERY_KEYS.all, "banner", id] as const,
  byMrn: (mrn: string) => [...EHR_PATIENT_QUERY_KEYS.all, "mrn", mrn] as const,
};

/**
 * Get paginated list of EHR patients
 */
export function useEhrPatients(params?: EhrPagination & EhrPatientSearchCriteria) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_PATIENT_QUERY_KEYS.list(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set("limit", String(params.limit));
      if (params?.offset) queryParams.set("offset", String(params.offset));
      if (params?.name) queryParams.set("name", params.name);
      if (params?.mrn) queryParams.set("mrn", params.mrn);
      if (params?.status) queryParams.set("status", params.status);

      const url = `${API_ROUTES.EHR.PATIENTS.LIST}?${queryParams.toString()}`;
      const response = await yottadbApiClient.get<EhrPaginatedResponse<EhrPatient>>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_patients", undefined, { action: "list", count: response.data.items.length });
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Search EHR patients
 */
export function useEhrPatientSearch(criteria: EhrPatientSearchCriteria, enabled = true) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: [...EHR_PATIENT_QUERY_KEYS.all, "search", criteria],
    queryFn: async () => {
      const response = await yottadbApiClient.post<EhrPaginatedResponse<EhrPatient>>(
        API_ROUTES.EHR.PATIENTS.SEARCH,
        criteria
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_patients", undefined, { action: "search", criteria });
      return response.data;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Get single EHR patient by ID
 */
export function useEhrPatient(id: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_PATIENT_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const response = await yottadbApiClient.get<EhrPatient>(API_ROUTES.EHR.PATIENTS.GET(id));

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_patients", id, { action: "view" });
      return response.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Get patient by MRN
 */
export function useEhrPatientByMrn(mrn: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_PATIENT_QUERY_KEYS.byMrn(mrn),
    queryFn: async () => {
      const response = await yottadbApiClient.get<EhrPatient>(API_ROUTES.EHR.PATIENTS.GET_BY_MRN(mrn));

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_patients", response.data.id, { action: "view_by_mrn", mrn });
      return response.data;
    },
    enabled: !!mrn,
    staleTime: 30 * 1000,
  });
}

/**
 * Get patient banner data (summary for display)
 */
export function useEhrPatientBanner(id: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_PATIENT_QUERY_KEYS.banner(id),
    queryFn: async () => {
      const response = await yottadbApiClient.get<EhrPatientBanner>(API_ROUTES.EHR.PATIENTS.BANNER(id));

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_patients", id, { action: "view_banner" });
      return response.data;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

/**
 * Create EHR patient mutation
 */
export function useCreateEhrPatient() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (patient: CreateEhrPatientRequest) => {
      const response = await yottadbApiClient.post<EhrPatient>(API_ROUTES.EHR.PATIENTS.CREATE, patient);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("CREATE", "ehr_patients", response.data.id, { action: "create" });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EHR_PATIENT_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Update EHR patient mutation
 */
export function useUpdateEhrPatient() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (patient: UpdateEhrPatientRequest) => {
      const { id, ...updates } = patient;
      const response = await yottadbApiClient.put<EhrPatient>(API_ROUTES.EHR.PATIENTS.UPDATE(id), updates);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_patients", id, { action: "update" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_PATIENT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_PATIENT_QUERY_KEYS.banner(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_PATIENT_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Delete EHR patient mutation
 */
export function useDeleteEhrPatient() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await yottadbApiClient.delete(API_ROUTES.EHR.PATIENTS.DELETE(id));

      if (response.error) throw new Error(response.error.message);

      logState("DELETE", "ehr_patients", id, { action: "delete" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EHR_PATIENT_QUERY_KEYS.lists() });
    },
  });
}

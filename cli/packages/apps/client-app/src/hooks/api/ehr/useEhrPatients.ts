/**
 * useEhrPatients Hook
 * TanStack Query hooks for EHR patient data with PHI audit logging
 * ✨ Now with Zod runtime validation for data integrity
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/yottadb-client";
import { z } from "zod";
import type {
  EhrPatient,
  EhrPatientBanner,
  EhrPatientSearchCriteria,
  CreateEhrPatientRequest,
  UpdateEhrPatientRequest,
  EhrPaginatedResponse,
  EhrPagination,
} from "@lazarus-life/shared/types/ehr";
import {
  EhrPatientSchema,
  EhrPatientBannerSchema,
  CreateEhrPatientRequestSchema,
  UpdateEhrPatientRequestSchema,
  EhrPatientSearchCriteriaSchema,
} from "@lazarus-life/shared/schemas/ehr/patient";
import { createQueryKeyFactory, unwrapApiResponse, buildQueryParams } from "@lazarus-life/shared";

// ✨ DRY: Using query key factory instead of 8-10 lines of boilerplate
export const EHR_PATIENT_QUERY_KEYS = {
  ...createQueryKeyFactory("ehr", "patients"),
  // Custom keys specific to patients
  banner: (id: string) => ["ehr", "patients", "banner", id] as const,
  byMrn: (mrn: string) => ["ehr", "patients", "mrn", mrn] as const,
};

/**
 * Get paginated list of EHR patients
 */
export function useEhrPatients(params?: EhrPagination & EhrPatientSearchCriteria) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_PATIENT_QUERY_KEYS.list(params),
    queryFn: async () => {
      // ✨ DRY: Using buildQueryParams instead of manual URLSearchParams construction
      const queryString = buildQueryParams({
        limit: params?.limit,
        offset: params?.offset,
        name: params?.name,
        mrn: params?.mrn,
        status: params?.status,
      });

      const url = `${API_ROUTES.EHR.PATIENTS.LIST}${queryString}`;
      const response = await apiClient.get<EhrPaginatedResponse<EhrPatient>>(url, {
        validateResponse: z.object({
          items: z.array(EhrPatientSchema),
          total: z.number(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        }),
        throwOnValidationError: true,
      });

      // ✨ DRY: Using unwrapApiResponse instead of repeated error handling
      const data = unwrapApiResponse(response);

      // Debug logging
      console.log('API Response:', data);
      console.log('First patient from API:', data.items?.[0]);

      logPHI("ehr_patients", undefined, { action: "list", count: data.items.length });
      return data;
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
    queryKey: EHR_PATIENT_QUERY_KEYS.custom("search", criteria),
    queryFn: async () => {
      const response = await apiClient.post<EhrPaginatedResponse<EhrPatient>>(
        API_ROUTES.EHR.PATIENTS.SEARCH,
        {
          body: criteria,
          validateRequest: EhrPatientSearchCriteriaSchema,
          validateResponse: z.object({
            items: z.array(EhrPatientSchema),
            total: z.number(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          }),
          throwOnValidationError: true,
        }
      );

      const data = unwrapApiResponse(response);
      logPHI("ehr_patients", undefined, { action: "search", criteria });
      return data;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Get single EHR patient by ID
 * ✨ With Zod validation
 */
export function useEhrPatient(id: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_PATIENT_QUERY_KEYS.detail(id),
    queryFn: async () => {
      console.log('Fetching patient with ID:', id);
      const response = await apiClient.get<EhrPatient>(API_ROUTES.EHR.PATIENTS.GET(id), {
        validateResponse: EhrPatientSchema,
        throwOnValidationError: true,
      });

      console.log('Patient detail response:', response);
      const data = unwrapApiResponse(response);
      console.log('Patient data:', data);
      logPHI("ehr_patients", id, { action: "view" });
      return data;
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
      const response = await apiClient.get<EhrPatient>(API_ROUTES.EHR.PATIENTS.GET_BY_MRN(mrn), {
        validateResponse: EhrPatientSchema,
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);
      logPHI("ehr_patients", data.id, { action: "view_by_mrn", mrn });
      return data;
    },
    enabled: !!mrn,
    staleTime: 30 * 1000,
  });
}

/**
 * Get patient banner data (summary for display)
 * ✨ With Zod validation
 */
export function useEhrPatientBanner(id: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_PATIENT_QUERY_KEYS.banner(id),
    queryFn: async () => {
      const response = await apiClient.get<EhrPatientBanner>(API_ROUTES.EHR.PATIENTS.BANNER(id), {
        validateResponse: EhrPatientBannerSchema,
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);
      logPHI("ehr_patients", id, { action: "view_banner" });
      return data;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

/**
 * Create EHR patient mutation
 * ✨ With Zod validation
 */
export function useCreateEhrPatient() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (patient: CreateEhrPatientRequest) => {
      const response = await apiClient.post<EhrPatient>(API_ROUTES.EHR.PATIENTS.CREATE, {
        body: patient,
        validateRequest: CreateEhrPatientRequestSchema,
        validateResponse: EhrPatientSchema,
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);
      logState("CREATE", "ehr_patients", data.id, { action: "create" });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EHR_PATIENT_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Update EHR patient mutation
 * ✨ With Zod validation
 */
export function useUpdateEhrPatient() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (patient: UpdateEhrPatientRequest) => {
      const { id, ...updates } = patient;
      const response = await apiClient.put<EhrPatient>(API_ROUTES.EHR.PATIENTS.UPDATE(id), {
        body: updates,
        validateRequest: UpdateEhrPatientRequestSchema,
        validateResponse: EhrPatientSchema,
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);
      logState("UPDATE", "ehr_patients", id, { action: "update" });
      return data;
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
      const response = await apiClient.delete(API_ROUTES.EHR.PATIENTS.DELETE(id));

      if (response.error) throw new Error(response.error.message);

      logState("DELETE", "ehr_patients", id, { action: "delete" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EHR_PATIENT_QUERY_KEYS.lists() });
    },
  });
}

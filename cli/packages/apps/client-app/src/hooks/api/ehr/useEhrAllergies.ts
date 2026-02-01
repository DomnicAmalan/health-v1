/**
 * useEhrAllergies Hook
 * TanStack Query hooks for EHR allergy data
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/yottadb-client";
import type {
  EhrAllergy,
  CreateEhrAllergyRequest,
  UpdateEhrAllergyRequest,
} from "@lazarus-life/shared/types/ehr";

export const EHR_ALLERGY_QUERY_KEYS = {
  all: ["ehr", "allergies"] as const,
  byPatient: (patientId: string) => [...EHR_ALLERGY_QUERY_KEYS.all, "patient", patientId] as const,
  detail: (id: string) => [...EHR_ALLERGY_QUERY_KEYS.all, "detail", id] as const,
};

/**
 * Get allergies for a patient
 */
export function useEhrPatientAllergies(patientId: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_ALLERGY_QUERY_KEYS.byPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<EhrAllergy[]>(
        API_ROUTES.EHR.ALLERGIES.BY_PATIENT(patientId)
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_allergies", undefined, { action: "list_by_patient", patientId });
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });
}

/**
 * Create allergy mutation
 */
export function useCreateEhrAllergy() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (allergy: CreateEhrAllergyRequest) => {
      const response = await apiClient.post<EhrAllergy>(API_ROUTES.EHR.ALLERGIES.CREATE, allergy);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("CREATE", "ehr_allergies", response.data.id, { action: "create" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_ALLERGY_QUERY_KEYS.byPatient(data.patientId) });
    },
  });
}

/**
 * Verify allergy mutation
 */
export function useVerifyEhrAllergy() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<EhrAllergy>(API_ROUTES.EHR.ALLERGIES.VERIFY(id), {});

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_allergies", id, { action: "verify" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_ALLERGY_QUERY_KEYS.byPatient(data.patientId) });
    },
  });
}

/**
 * Delete allergy mutation
 */
export function useDeleteEhrAllergy() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const response = await apiClient.delete(API_ROUTES.EHR.ALLERGIES.DELETE(id));

      if (response.error) throw new Error(response.error.message);

      logState("DELETE", "ehr_allergies", id, { action: "delete" });
      return patientId;
    },
    onSuccess: (patientId) => {
      queryClient.invalidateQueries({ queryKey: EHR_ALLERGY_QUERY_KEYS.byPatient(patientId) });
    },
  });
}

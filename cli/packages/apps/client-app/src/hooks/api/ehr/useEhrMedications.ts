/**
 * useEhrMedications Hook
 * TanStack Query hooks for EHR medication data
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/client";
import type {
  EhrMedication,
  CreateEhrMedicationRequest,
  UpdateEhrMedicationRequest,
} from "@lazarus-life/shared/types/ehr";

export const EHR_MEDICATION_QUERY_KEYS = {
  all: ["ehr", "medications"] as const,
  byPatient: (patientId: string) =>
    [...EHR_MEDICATION_QUERY_KEYS.all, "patient", patientId] as const,
  detail: (id: string) => [...EHR_MEDICATION_QUERY_KEYS.all, "detail", id] as const,
};

/**
 * Get medications for a patient
 */
export function useEhrPatientMedications(patientId: string, activeOnly = true) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: [...EHR_MEDICATION_QUERY_KEYS.byPatient(patientId), { activeOnly }],
    queryFn: async () => {
      const url = `${API_ROUTES.EHR.MEDICATIONS.BY_PATIENT(patientId)}?activeOnly=${activeOnly}`;
      const response = await apiClient.get<EhrMedication[]>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_medications", undefined, { action: "list_by_patient", patientId });
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Create medication mutation
 */
export function useCreateEhrMedication() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (medication: CreateEhrMedicationRequest) => {
      const response = await apiClient.post<EhrMedication>(
        API_ROUTES.EHR.MEDICATIONS.CREATE,
        medication
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("CREATE", "ehr_medications", response.data.id, { action: "create" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: EHR_MEDICATION_QUERY_KEYS.byPatient(data.patientId),
      });
    },
  });
}

/**
 * Discontinue medication mutation
 */
export function useDiscontinueEhrMedication() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await apiClient.post<EhrMedication>(
        API_ROUTES.EHR.MEDICATIONS.DISCONTINUE(id),
        { reason }
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_medications", id, { action: "discontinue" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: EHR_MEDICATION_QUERY_KEYS.byPatient(data.patientId),
      });
    },
  });
}

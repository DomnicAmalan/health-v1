/**
 * useDrugInteractionCheck Hook
 * TanStack Query hooks for drug interaction and allergy checking
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/client";
import type {
  InteractionCheckRequest,
  InteractionCheckResponse,
  DrugAllergyCheckResponse,
} from "@lazarus-life/shared/types/ehr";

export const INTERACTION_CHECK_QUERY_KEYS = {
  all: ["pharmacy", "interactions"] as const,
  check: (drugIds: string[]) =>
    [...INTERACTION_CHECK_QUERY_KEYS.all, "check", ...drugIds] as const,
  withPatient: (patientId: string, drugIds: string[]) =>
    [...INTERACTION_CHECK_QUERY_KEYS.all, "patient", patientId, ...drugIds] as const,
  allergyCheck: (patientId: string, drugIds: string[]) =>
    [...INTERACTION_CHECK_QUERY_KEYS.all, "allergy", patientId, ...drugIds] as const,
};

/**
 * Check interactions between a list of drugs (no patient context)
 * Use this for general drug-drug interaction checking
 */
export function useCheckDrugInteractions(drugIds: string[]) {
  return useQuery({
    queryKey: INTERACTION_CHECK_QUERY_KEYS.check(drugIds),
    queryFn: async () => {
      const request: InteractionCheckRequest = { drugIds };
      const response = await apiClient.post<InteractionCheckResponse>(
        API_ROUTES.PHARMACY.INTERACTIONS.CHECK,
        request
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      return response.data;
    },
    enabled: drugIds.length >= 2, // Need at least 2 drugs to check interactions
    staleTime: 30 * 1000,
  });
}

/**
 * Check interactions for drugs against a patient's current medications and allergies
 * This is the primary hook for prescription entry workflow
 */
export function useCheckPatientDrugInteractions(
  patientId: string,
  drugIds: string[]
) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: INTERACTION_CHECK_QUERY_KEYS.withPatient(patientId, drugIds),
    queryFn: async () => {
      const request: InteractionCheckRequest = {
        drugIds,
        patientIen: parseInt(patientId, 10),
      };
      const response = await apiClient.post<InteractionCheckResponse>(
        API_ROUTES.PHARMACY.INTERACTIONS.CHECK_WITH_PATIENT(patientId),
        request
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("pharmacy_interactions", undefined, {
        action: "check_patient_interactions",
        patientId,
        drugCount: drugIds.length,
      });
      return response.data;
    },
    enabled: !!patientId && drugIds.length >= 1,
    staleTime: 0, // Always re-check as patient data might change
  });
}

/**
 * Check if drugs conflict with patient allergies
 */
export function useCheckPatientAllergies(
  patientId: string,
  drugIds: string[]
) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: INTERACTION_CHECK_QUERY_KEYS.allergyCheck(patientId, drugIds),
    queryFn: async () => {
      const response = await apiClient.post<DrugAllergyCheckResponse>(
        API_ROUTES.PHARMACY.ALLERGY_CHECK.CHECK_WITH_PATIENT(patientId),
        { drugIds }
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("pharmacy_allergy_check", undefined, {
        action: "check_patient_allergies",
        patientId,
        drugCount: drugIds.length,
      });
      return response.data;
    },
    enabled: !!patientId && drugIds.length >= 1,
    staleTime: 0, // Always re-check as allergies might be updated
  });
}

/**
 * Mutation version for on-demand interaction checking
 * Use this when you need imperative control over when the check happens
 */
export function useInteractionCheckMutation() {
  const { logPHI } = useAuditLog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: InteractionCheckRequest) => {
      const url = request.patientIen
        ? API_ROUTES.PHARMACY.INTERACTIONS.CHECK_WITH_PATIENT(
            String(request.patientIen)
          )
        : API_ROUTES.PHARMACY.INTERACTIONS.CHECK;

      const response = await apiClient.post<InteractionCheckResponse>(
        url,
        request
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      if (request.patientIen) {
        logPHI("pharmacy_interactions", undefined, {
          action: "check_interactions_mutation",
          patientIen: request.patientIen,
          drugCount: request.drugIds.length,
        });
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Cache the result
      if (variables.patientIen) {
        queryClient.setQueryData(
          INTERACTION_CHECK_QUERY_KEYS.withPatient(
            String(variables.patientIen),
            variables.drugIds
          ),
          data
        );
      } else {
        queryClient.setQueryData(
          INTERACTION_CHECK_QUERY_KEYS.check(variables.drugIds),
          data
        );
      }
    },
  });
}

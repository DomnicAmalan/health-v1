/**
 * useEhrProblems Hook
 * TanStack Query hooks for EHR problem list data
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/yottadb-client";
import type {
  EhrProblem,
  CreateEhrProblemRequest,
  UpdateEhrProblemRequest,
  EhrPaginatedResponse,
} from "@lazarus-life/shared/types/ehr";

export const EHR_PROBLEM_QUERY_KEYS = {
  all: ["ehr", "problems"] as const,
  lists: () => [...EHR_PROBLEM_QUERY_KEYS.all, "list"] as const,
  details: () => [...EHR_PROBLEM_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...EHR_PROBLEM_QUERY_KEYS.details(), id] as const,
  byPatient: (patientId: string) => [...EHR_PROBLEM_QUERY_KEYS.all, "patient", patientId] as const,
};

/**
 * Get problems for a patient
 */
export function useEhrPatientProblems(patientId: string, includeInactive = false) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: [...EHR_PROBLEM_QUERY_KEYS.byPatient(patientId), { includeInactive }],
    queryFn: async () => {
      const url = `${API_ROUTES.EHR.PROBLEMS.BY_PATIENT(patientId)}?includeInactive=${includeInactive}`;
      const response = await yottadbApiClient.get<EhrProblem[]>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_problems", undefined, { action: "list_by_patient", patientId });
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get single problem by ID
 */
export function useEhrProblem(id: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_PROBLEM_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const response = await yottadbApiClient.get<EhrProblem>(API_ROUTES.EHR.PROBLEMS.GET(id));

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_problems", id, { action: "view" });
      return response.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Create problem mutation
 */
export function useCreateEhrProblem() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (problem: CreateEhrProblemRequest) => {
      const response = await yottadbApiClient.post<EhrProblem>(API_ROUTES.EHR.PROBLEMS.CREATE, problem);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("CREATE", "ehr_problems", response.data.id, { action: "create" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_PROBLEM_QUERY_KEYS.byPatient(data.patientId) });
    },
  });
}

/**
 * Update problem mutation
 */
export function useUpdateEhrProblem() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (problem: UpdateEhrProblemRequest) => {
      const { id, ...updates } = problem;
      const response = await yottadbApiClient.put<EhrProblem>(API_ROUTES.EHR.PROBLEMS.UPDATE(id), updates);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_problems", id, { action: "update" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_PROBLEM_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_PROBLEM_QUERY_KEYS.byPatient(data.patientId) });
    },
  });
}

/**
 * Resolve problem mutation
 */
export function useResolveEhrProblem() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await yottadbApiClient.post<EhrProblem>(API_ROUTES.EHR.PROBLEMS.RESOLVE(id), {});

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_problems", id, { action: "resolve" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_PROBLEM_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_PROBLEM_QUERY_KEYS.byPatient(data.patientId) });
    },
  });
}

/**
 * Reactivate problem mutation
 */
export function useReactivateEhrProblem() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await yottadbApiClient.post<EhrProblem>(API_ROUTES.EHR.PROBLEMS.REACTIVATE(id), {});

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_problems", id, { action: "reactivate" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_PROBLEM_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_PROBLEM_QUERY_KEYS.byPatient(data.patientId) });
    },
  });
}

/**
 * Delete problem mutation
 */
export function useDeleteEhrProblem() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const response = await yottadbApiClient.delete(API_ROUTES.EHR.PROBLEMS.DELETE(id));

      if (response.error) throw new Error(response.error.message);

      logState("DELETE", "ehr_problems", id, { action: "delete" });
      return patientId;
    },
    onSuccess: (patientId) => {
      queryClient.invalidateQueries({ queryKey: EHR_PROBLEM_QUERY_KEYS.byPatient(patientId) });
    },
  });
}

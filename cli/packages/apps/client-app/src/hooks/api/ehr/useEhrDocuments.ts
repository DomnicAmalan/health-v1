/**
 * useEhrDocuments Hook
 * TanStack Query hooks for EHR clinical document data
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/client";
import type {
  EhrDocument,
  CreateEhrDocumentRequest,
  UpdateEhrDocumentRequest,
  EhrPaginatedResponse,
  EhrPagination,
} from "@lazarus-life/shared/types/ehr";

export const EHR_DOCUMENT_QUERY_KEYS = {
  all: ["ehr", "documents"] as const,
  byPatient: (patientId: string) => [...EHR_DOCUMENT_QUERY_KEYS.all, "patient", patientId] as const,
  byVisit: (visitId: string) => [...EHR_DOCUMENT_QUERY_KEYS.all, "visit", visitId] as const,
  detail: (id: string) => [...EHR_DOCUMENT_QUERY_KEYS.all, "detail", id] as const,
  unsigned: () => [...EHR_DOCUMENT_QUERY_KEYS.all, "unsigned"] as const,
};

/**
 * Get documents for a patient
 */
export function useEhrPatientDocuments(patientId: string, pagination?: EhrPagination) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: [...EHR_DOCUMENT_QUERY_KEYS.byPatient(patientId), pagination],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (pagination?.limit) queryParams.set("limit", String(pagination.limit));
      if (pagination?.offset) queryParams.set("offset", String(pagination.offset));

      const url = `${API_ROUTES.EHR.DOCUMENTS.BY_PATIENT(patientId)}?${queryParams.toString()}`;
      const response = await apiClient.get<EhrPaginatedResponse<EhrDocument>>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_documents", undefined, { action: "list_by_patient", patientId });
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get documents for a visit
 */
export function useEhrVisitDocuments(visitId: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_DOCUMENT_QUERY_KEYS.byVisit(visitId),
    queryFn: async () => {
      const response = await apiClient.get<EhrDocument[]>(API_ROUTES.EHR.DOCUMENTS.BY_VISIT(visitId));

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_documents", undefined, { action: "list_by_visit", visitId });
      return response.data;
    },
    enabled: !!visitId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get single document by ID
 */
export function useEhrDocument(id: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_DOCUMENT_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<EhrDocument>(API_ROUTES.EHR.DOCUMENTS.GET(id));

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_documents", id, { action: "view" });
      return response.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Get unsigned documents
 */
export function useEhrUnsignedDocuments() {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_DOCUMENT_QUERY_KEYS.unsigned(),
    queryFn: async () => {
      const response = await apiClient.get<EhrDocument[]>(API_ROUTES.EHR.DOCUMENTS.UNSIGNED);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_documents", undefined, { action: "list_unsigned" });
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

/**
 * Create document mutation
 */
export function useCreateEhrDocument() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (document: CreateEhrDocumentRequest) => {
      const response = await apiClient.post<EhrDocument>(API_ROUTES.EHR.DOCUMENTS.CREATE, document);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("CREATE", "ehr_documents", response.data.id, { action: "create" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.byPatient(data.patientId) });
      if (data.visitId) {
        queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.byVisit(data.visitId) });
      }
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.unsigned() });
    },
  });
}

/**
 * Update document mutation
 */
export function useUpdateEhrDocument() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (document: UpdateEhrDocumentRequest) => {
      const { id, ...updates } = document;
      const response = await apiClient.put<EhrDocument>(API_ROUTES.EHR.DOCUMENTS.UPDATE(id), updates);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_documents", id, { action: "update" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.byPatient(data.patientId) });
      if (data.visitId) {
        queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.byVisit(data.visitId) });
      }
    },
  });
}

/**
 * Sign document mutation
 */
export function useSignEhrDocument() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<EhrDocument>(API_ROUTES.EHR.DOCUMENTS.SIGN(id), {});

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_documents", id, { action: "sign" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.byPatient(data.patientId) });
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.unsigned() });
    },
  });
}

/**
 * Cosign document mutation
 */
export function useCosignEhrDocument() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<EhrDocument>(API_ROUTES.EHR.DOCUMENTS.COSIGN(id), {});

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_documents", id, { action: "cosign" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.byPatient(data.patientId) });
    },
  });
}

/**
 * Create addendum mutation
 */
export function useCreateEhrAddendum() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({ parentDocumentId, content }: { parentDocumentId: string; content: string }) => {
      const response = await apiClient.post<EhrDocument>(API_ROUTES.EHR.DOCUMENTS.ADDENDUM(parentDocumentId), {
        content,
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("CREATE", "ehr_documents", response.data.id, { action: "addendum", parentDocumentId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.byPatient(data.patientId) });
      if (data.parentDocumentId) {
        queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.detail(data.parentDocumentId) });
      }
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.unsigned() });
    },
  });
}

/**
 * Delete document mutation
 */
export function useDeleteEhrDocument() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const response = await apiClient.delete(API_ROUTES.EHR.DOCUMENTS.DELETE(id));

      if (response.error) throw new Error(response.error.message);

      logState("DELETE", "ehr_documents", id, { action: "delete" });
      return patientId;
    },
    onSuccess: (patientId) => {
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.byPatient(patientId) });
      queryClient.invalidateQueries({ queryKey: EHR_DOCUMENT_QUERY_KEYS.unsigned() });
    },
  });
}

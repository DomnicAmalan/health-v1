/**
 * useEhrOrders Hook
 * TanStack Query hooks for EHR order data
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/client";
import type {
  EhrOrder,
  CreateEhrOrderRequest,
  UpdateEhrOrderRequest,
  DiscontinueEhrOrderRequest,
  EhrPaginatedResponse,
  EhrPagination,
} from "@lazarus-life/shared/types/ehr";

export const EHR_ORDER_QUERY_KEYS = {
  all: ["ehr", "orders"] as const,
  byPatient: (patientId: string) => [...EHR_ORDER_QUERY_KEYS.all, "patient", patientId] as const,
  byVisit: (visitId: string) => [...EHR_ORDER_QUERY_KEYS.all, "visit", visitId] as const,
  detail: (id: string) => [...EHR_ORDER_QUERY_KEYS.all, "detail", id] as const,
  unsigned: () => [...EHR_ORDER_QUERY_KEYS.all, "unsigned"] as const,
  stat: () => [...EHR_ORDER_QUERY_KEYS.all, "stat"] as const,
};

/**
 * Get orders for a patient
 */
export function useEhrPatientOrders(patientId: string, pagination?: EhrPagination) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: [...EHR_ORDER_QUERY_KEYS.byPatient(patientId), pagination],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (pagination?.limit) queryParams.set("limit", String(pagination.limit));
      if (pagination?.offset) queryParams.set("offset", String(pagination.offset));

      const url = `${API_ROUTES.EHR.ORDERS.BY_PATIENT(patientId)}?${queryParams.toString()}`;
      const response = await apiClient.get<EhrPaginatedResponse<EhrOrder>>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_orders", undefined, { action: "list_by_patient", patientId });
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get orders for a visit
 */
export function useEhrVisitOrders(visitId: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_ORDER_QUERY_KEYS.byVisit(visitId),
    queryFn: async () => {
      const response = await apiClient.get<EhrOrder[]>(API_ROUTES.EHR.ORDERS.BY_VISIT(visitId));

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_orders", undefined, { action: "list_by_visit", visitId });
      return response.data;
    },
    enabled: !!visitId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get single order by ID
 */
export function useEhrOrder(id: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_ORDER_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<EhrOrder>(API_ROUTES.EHR.ORDERS.GET(id));

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_orders", id, { action: "view" });
      return response.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Get unsigned orders
 */
export function useEhrUnsignedOrders() {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_ORDER_QUERY_KEYS.unsigned(),
    queryFn: async () => {
      const response = await apiClient.get<EhrOrder[]>(API_ROUTES.EHR.ORDERS.UNSIGNED);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_orders", undefined, { action: "list_unsigned" });
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
}

/**
 * Get STAT orders
 */
export function useEhrStatOrders() {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_ORDER_QUERY_KEYS.stat(),
    queryFn: async () => {
      const response = await apiClient.get<EhrOrder[]>(API_ROUTES.EHR.ORDERS.STAT);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_orders", undefined, { action: "list_stat" });
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refresh every minute for urgent orders
  });
}

/**
 * Create order mutation
 */
export function useCreateEhrOrder() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (order: CreateEhrOrderRequest) => {
      const response = await apiClient.post<EhrOrder>(API_ROUTES.EHR.ORDERS.CREATE, order);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("CREATE", "ehr_orders", response.data.id, { action: "create" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.byPatient(data.patientId) });
      if (data.visitId) {
        queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.byVisit(data.visitId) });
      }
      queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.unsigned() });
      if (data.urgency === "stat") {
        queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.stat() });
      }
    },
  });
}

/**
 * Sign order mutation
 */
export function useSignEhrOrder() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<EhrOrder>(API_ROUTES.EHR.ORDERS.SIGN(id), {});

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_orders", id, { action: "sign" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.byPatient(data.patientId) });
      queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.unsigned() });
    },
  });
}

/**
 * Discontinue order mutation
 */
export function useDiscontinueEhrOrder() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, reason }: DiscontinueEhrOrderRequest) => {
      const response = await apiClient.post<EhrOrder>(API_ROUTES.EHR.ORDERS.DISCONTINUE(id), { reason });

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_orders", id, { action: "discontinue" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.byPatient(data.patientId) });
      if (data.visitId) {
        queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.byVisit(data.visitId) });
      }
    },
  });
}

/**
 * Hold order mutation
 */
export function useHoldEhrOrder() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await apiClient.post<EhrOrder>(API_ROUTES.EHR.ORDERS.HOLD(id), { reason });

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_orders", id, { action: "hold" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.byPatient(data.patientId) });
    },
  });
}

/**
 * Release held order mutation
 */
export function useReleaseEhrOrder() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<EhrOrder>(API_ROUTES.EHR.ORDERS.RELEASE(id), {});

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_orders", id, { action: "release" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_ORDER_QUERY_KEYS.byPatient(data.patientId) });
    },
  });
}

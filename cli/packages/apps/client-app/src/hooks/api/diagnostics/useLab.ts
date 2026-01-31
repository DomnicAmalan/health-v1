/**
 * useLab Hook
 * TanStack Query hooks for Laboratory Information System
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  LabTest,
  TestPanel,
  LabOrder,
  Sample,
  LabResult,
  LabReport,
  LabTestListResponse,
  TestPanelListResponse,
  LabOrderListResponse,
  SampleListResponse,
  LabResultListResponse,
  LabDashboardStats,
  LabWorklist,
  CreateLabOrderRequest,
  CollectSampleRequest,
  ReceiveSampleRequest,
  RejectSampleRequest,
  EnterResultRequest,
  VerifyResultRequest,
  NotifyCriticalRequest,
  TestCategory,
} from "@lazarus-life/shared/types/diagnostics";

export const LAB_QUERY_KEYS = {
  all: ["diagnostics", "lab"] as const,
  tests: () => [...LAB_QUERY_KEYS.all, "tests"] as const,
  test: (id: string) => [...LAB_QUERY_KEYS.all, "test", id] as const,
  testsByCategory: (category: string) => [...LAB_QUERY_KEYS.all, "tests", "category", category] as const,
  panels: () => [...LAB_QUERY_KEYS.all, "panels"] as const,
  panel: (id: string) => [...LAB_QUERY_KEYS.all, "panel", id] as const,
  orders: () => [...LAB_QUERY_KEYS.all, "orders"] as const,
  order: (id: string) => [...LAB_QUERY_KEYS.all, "order", id] as const,
  ordersByPatient: (patientId: string) => [...LAB_QUERY_KEYS.all, "orders", "patient", patientId] as const,
  pendingOrders: () => [...LAB_QUERY_KEYS.all, "orders", "pending"] as const,
  samples: (params?: { status?: string }) => params ? [...LAB_QUERY_KEYS.all, "samples", params] as const : [...LAB_QUERY_KEYS.all, "samples"] as const,
  sample: (id: string) => [...LAB_QUERY_KEYS.all, "sample", id] as const,
  samplesByOrder: (orderId: string) => [...LAB_QUERY_KEYS.all, "samples", "order", orderId] as const,
  pendingCollection: () => [...LAB_QUERY_KEYS.all, "samples", "pending-collection"] as const,
  pendingReceipt: () => [...LAB_QUERY_KEYS.all, "samples", "pending-receipt"] as const,
  results: () => [...LAB_QUERY_KEYS.all, "results"] as const,
  result: (id: string) => [...LAB_QUERY_KEYS.all, "result", id] as const,
  resultsBySample: (sampleId: string) => [...LAB_QUERY_KEYS.all, "results", "sample", sampleId] as const,
  resultsByPatient: (patientId: string) => [...LAB_QUERY_KEYS.all, "results", "patient", patientId] as const,
  criticalResults: () => [...LAB_QUERY_KEYS.all, "results", "critical"] as const,
  pendingVerification: () => [...LAB_QUERY_KEYS.all, "results", "pending-verification"] as const,
  reports: () => [...LAB_QUERY_KEYS.all, "reports"] as const,
  report: (id: string) => [...LAB_QUERY_KEYS.all, "report", id] as const,
  reportsByPatient: (patientId: string) => [...LAB_QUERY_KEYS.all, "reports", "patient", patientId] as const,
  worklist: (type: string) => [...LAB_QUERY_KEYS.all, "worklist", type] as const,
  dashboard: () => [...LAB_QUERY_KEYS.all, "dashboard"] as const,
};

interface TestQueryParams {
  category?: TestCategory;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

interface OrderQueryParams {
  status?: string;
  priority?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

interface ResultQueryParams {
  status?: string;
  isCritical?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ============ TEST CATALOG ============

/**
 * Get all lab tests with optional filters
 */
export function useLabTests(params?: TestQueryParams) {
  return useQuery({
    queryKey: [...LAB_QUERY_KEYS.tests(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set("category", params.category);
      if (params?.search) searchParams.set("search", params.search);
      if (params?.isActive !== undefined) searchParams.set("is_active", String(params.isActive));
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const url = searchParams.toString()
        ? `${API_ROUTES.DIAGNOSTICS.LAB.TESTS.LIST}?${searchParams.toString()}`
        : API_ROUTES.DIAGNOSTICS.LAB.TESTS.LIST;

      const response = await apiClient.get<LabTestListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.tests;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a specific lab test
 */
export function useLabTest(testId: string) {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.test(testId),
    queryFn: async () => {
      const response = await apiClient.get<LabTest>(
        API_ROUTES.DIAGNOSTICS.LAB.TESTS.GET(testId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!testId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Search lab tests
 */
export function useLabTestSearch(query: string) {
  return useQuery({
    queryKey: [...LAB_QUERY_KEYS.tests(), "search", query],
    queryFn: async () => {
      const response = await apiClient.get<LabTestListResponse>(
        `${API_ROUTES.DIAGNOSTICS.LAB.TESTS.SEARCH}?q=${encodeURIComponent(query)}`
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.tests;
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}

/**
 * Get test panels
 */
export function useTestPanels() {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.panels(),
    queryFn: async () => {
      const response = await apiClient.get<TestPanelListResponse>(
        API_ROUTES.DIAGNOSTICS.LAB.PANELS.LIST
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.panels;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============ LAB ORDERS ============

/**
 * Get lab orders with filters
 */
export function useLabOrders(params?: OrderQueryParams) {
  return useQuery({
    queryKey: [...LAB_QUERY_KEYS.orders(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      if (params?.priority) searchParams.set("priority", params.priority);
      if (params?.fromDate) searchParams.set("from_date", params.fromDate);
      if (params?.toDate) searchParams.set("to_date", params.toDate);
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const url = searchParams.toString()
        ? `${API_ROUTES.DIAGNOSTICS.LAB.ORDERS.LIST}?${searchParams.toString()}`
        : API_ROUTES.DIAGNOSTICS.LAB.ORDERS.LIST;

      const response = await apiClient.get<LabOrderListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get pending lab orders
 */
export function usePendingLabOrders() {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.pendingOrders(),
    queryFn: async () => {
      const response = await apiClient.get<LabOrderListResponse>(
        API_ROUTES.DIAGNOSTICS.LAB.ORDERS.PENDING
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get a specific lab order
 */
export function useLabOrder(orderId: string) {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.order(orderId),
    queryFn: async () => {
      const response = await apiClient.get<LabOrder>(
        API_ROUTES.DIAGNOSTICS.LAB.ORDERS.GET(orderId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!orderId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get patient's lab orders
 */
export function usePatientLabOrders(patientId: string) {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.ordersByPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<LabOrderListResponse>(
        API_ROUTES.DIAGNOSTICS.LAB.ORDERS.BY_PATIENT(patientId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });
}

/**
 * Create a lab order
 */
export function useCreateLabOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateLabOrderRequest) => {
      const response = await apiClient.post<LabOrder>(
        API_ROUTES.DIAGNOSTICS.LAB.ORDERS.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.orders() });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.pendingOrders() });
      queryClient.invalidateQueries({
        queryKey: LAB_QUERY_KEYS.ordersByPatient(data.patientId),
      });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Cancel a lab order
 */
export function useCancelLabOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post<LabOrder>(
        API_ROUTES.DIAGNOSTICS.LAB.ORDERS.CANCEL(orderId),
        {}
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.order(orderId) });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.orders() });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.pendingOrders() });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.dashboard() });
    },
  });
}

// ============ SAMPLES ============

/**
 * Get samples pending collection
 */
export function usePendingCollectionSamples() {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.pendingCollection(),
    queryFn: async () => {
      const response = await apiClient.get<SampleListResponse>(
        API_ROUTES.DIAGNOSTICS.LAB.SAMPLES.PENDING_COLLECTION
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.samples;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get samples pending receipt
 */
export function usePendingReceiptSamples() {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.pendingReceipt(),
    queryFn: async () => {
      const response = await apiClient.get<SampleListResponse>(
        API_ROUTES.DIAGNOSTICS.LAB.SAMPLES.PENDING_RECEIPT
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.samples;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get samples ready for processing (received status)
 */
export function usePendingProcessingSamples() {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.samples({ status: "received" }),
    queryFn: async () => {
      const response = await apiClient.get<SampleListResponse>(
        API_ROUTES.DIAGNOSTICS.LAB.SAMPLES.LIST,
        { params: { status: "received" } }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.samples;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Collect a sample
 */
export function useCollectSample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CollectSampleRequest) => {
      const response = await apiClient.post<Sample>(
        API_ROUTES.DIAGNOSTICS.LAB.SAMPLES.COLLECT,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.samples() });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.pendingCollection() });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.pendingReceipt() });
      queryClient.invalidateQueries({
        queryKey: LAB_QUERY_KEYS.order(data.orderId),
      });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Receive a sample
 */
export function useReceiveSample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sampleId, data }: { sampleId: string; data: Omit<ReceiveSampleRequest, "sampleId"> }) => {
      const response = await apiClient.post<Sample>(
        API_ROUTES.DIAGNOSTICS.LAB.SAMPLES.RECEIVE(sampleId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { sampleId }) => {
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.sample(sampleId) });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.samples() });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.pendingReceipt() });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Reject a sample
 */
export function useRejectSample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sampleId, reason }: { sampleId: string; reason: string }) => {
      const response = await apiClient.post<Sample>(
        API_ROUTES.DIAGNOSTICS.LAB.SAMPLES.REJECT(sampleId),
        { rejectionReason: reason }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { sampleId }) => {
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.sample(sampleId) });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.samples() });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.pendingReceipt() });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.dashboard() });
    },
  });
}

// ============ RESULTS ============

/**
 * Get critical results
 */
export function useCriticalResults() {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.criticalResults(),
    queryFn: async () => {
      const response = await apiClient.get<LabResultListResponse>(
        API_ROUTES.DIAGNOSTICS.LAB.RESULTS.CRITICAL
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.results;
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Get results pending verification
 */
export function usePendingVerificationResults() {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.pendingVerification(),
    queryFn: async () => {
      const response = await apiClient.get<LabResultListResponse>(
        API_ROUTES.DIAGNOSTICS.LAB.RESULTS.PENDING_VERIFICATION
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.results;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get patient's lab results
 */
export function usePatientLabResults(patientId: string) {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.resultsByPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<LabResultListResponse>(
        API_ROUTES.DIAGNOSTICS.LAB.RESULTS.BY_PATIENT(patientId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.results;
    },
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });
}

/**
 * Enter a lab result
 */
export function useEnterLabResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: EnterResultRequest) => {
      const response = await apiClient.post<LabResult>(
        API_ROUTES.DIAGNOSTICS.LAB.RESULTS.ENTER,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.results() });
      queryClient.invalidateQueries({
        queryKey: LAB_QUERY_KEYS.resultsBySample(data.sampleId),
      });
      queryClient.invalidateQueries({
        queryKey: LAB_QUERY_KEYS.resultsByPatient(data.patientId),
      });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.pendingVerification() });
      if (data.isCritical) {
        queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.criticalResults() });
      }
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Verify a lab result
 */
export function useVerifyLabResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resultId, comments }: { resultId: string; comments?: string }) => {
      const response = await apiClient.post<LabResult>(
        API_ROUTES.DIAGNOSTICS.LAB.RESULTS.VERIFY(resultId),
        { comments }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { resultId }) => {
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.result(resultId) });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.results() });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.pendingVerification() });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Notify critical result
 */
export function useNotifyCriticalResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resultId,
      data,
    }: {
      resultId: string;
      data: Omit<NotifyCriticalRequest, "resultId">;
    }) => {
      const response = await apiClient.post<LabResult>(
        API_ROUTES.DIAGNOSTICS.LAB.RESULTS.NOTIFY_CRITICAL(resultId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { resultId }) => {
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.result(resultId) });
      queryClient.invalidateQueries({ queryKey: LAB_QUERY_KEYS.criticalResults() });
    },
  });
}

// ============ WORKLIST ============

/**
 * Get collection worklist
 */
export function useCollectionWorklist() {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.worklist("collection"),
    queryFn: async () => {
      const response = await apiClient.get<LabWorklist>(
        API_ROUTES.DIAGNOSTICS.LAB.WORKLIST.COLLECTION
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.items;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get processing worklist
 */
export function useProcessingWorklist() {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.worklist("processing"),
    queryFn: async () => {
      const response = await apiClient.get<LabWorklist>(
        API_ROUTES.DIAGNOSTICS.LAB.WORKLIST.PROCESSING
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.items;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get verification worklist
 */
export function useVerificationWorklist() {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.worklist("verification"),
    queryFn: async () => {
      const response = await apiClient.get<LabWorklist>(
        API_ROUTES.DIAGNOSTICS.LAB.WORKLIST.VERIFICATION
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.items;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// ============ DASHBOARD ============

/**
 * Get lab dashboard statistics
 */
export function useLabDashboard() {
  return useQuery({
    queryKey: LAB_QUERY_KEYS.dashboard(),
    queryFn: async () => {
      const response = await apiClient.get<LabDashboardStats>(
        API_ROUTES.DIAGNOSTICS.LAB.DASHBOARD
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * useRadiology Hook
 * TanStack Query hooks for Radiology Information System
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  RadiologyExamType,
  RadiologyRoom,
  RadiologyOrder,
  RadiologyExam,
  RadiologyReport,
  RadiologyTemplate,
  RadiologyExamTypeListResponse,
  RadiologyRoomListResponse,
  RadiologyOrderListResponse,
  RadiologyExamListResponse,
  RadiologyReportListResponse,
  RadiologyDashboardStats,
  RadiologyWorklist,
  RadiologySchedule,
  CreateRadiologyOrderRequest,
  ScheduleExamRequest,
  StartExamRequest,
  CompleteExamRequest,
  CreateReportRequest,
  SignReportRequest,
  AddAddendumRequest,
  NotifyCriticalFindingRequest,
  Modality,
} from "@lazarus-life/shared/types/diagnostics";

export const RADIOLOGY_QUERY_KEYS = {
  all: ["diagnostics", "radiology"] as const,
  examTypes: () => [...RADIOLOGY_QUERY_KEYS.all, "examTypes"] as const,
  examType: (id: string) => [...RADIOLOGY_QUERY_KEYS.all, "examType", id] as const,
  examTypesByModality: (modality: string) =>
    [...RADIOLOGY_QUERY_KEYS.all, "examTypes", "modality", modality] as const,
  rooms: () => [...RADIOLOGY_QUERY_KEYS.all, "rooms"] as const,
  room: (id: string) => [...RADIOLOGY_QUERY_KEYS.all, "room", id] as const,
  roomsByModality: (modality: string) =>
    [...RADIOLOGY_QUERY_KEYS.all, "rooms", "modality", modality] as const,
  orders: () => [...RADIOLOGY_QUERY_KEYS.all, "orders"] as const,
  order: (id: string) => [...RADIOLOGY_QUERY_KEYS.all, "order", id] as const,
  ordersByPatient: (patientId: string) =>
    [...RADIOLOGY_QUERY_KEYS.all, "orders", "patient", patientId] as const,
  pendingOrders: () => [...RADIOLOGY_QUERY_KEYS.all, "orders", "pending"] as const,
  exams: () => [...RADIOLOGY_QUERY_KEYS.all, "exams"] as const,
  exam: (id: string) => [...RADIOLOGY_QUERY_KEYS.all, "exam", id] as const,
  examsByPatient: (patientId: string) =>
    [...RADIOLOGY_QUERY_KEYS.all, "exams", "patient", patientId] as const,
  todayExams: () => [...RADIOLOGY_QUERY_KEYS.all, "exams", "today"] as const,
  inProgressExams: () => [...RADIOLOGY_QUERY_KEYS.all, "exams", "in-progress"] as const,
  reports: () => [...RADIOLOGY_QUERY_KEYS.all, "reports"] as const,
  report: (id: string) => [...RADIOLOGY_QUERY_KEYS.all, "report", id] as const,
  reportsByPatient: (patientId: string) =>
    [...RADIOLOGY_QUERY_KEYS.all, "reports", "patient", patientId] as const,
  pendingReports: () => [...RADIOLOGY_QUERY_KEYS.all, "reports", "pending"] as const,
  criticalReports: () => [...RADIOLOGY_QUERY_KEYS.all, "reports", "critical"] as const,
  templates: () => [...RADIOLOGY_QUERY_KEYS.all, "templates"] as const,
  template: (id: string) => [...RADIOLOGY_QUERY_KEYS.all, "template", id] as const,
  templatesByModality: (modality: string) =>
    [...RADIOLOGY_QUERY_KEYS.all, "templates", "modality", modality] as const,
  worklist: (type: string) => [...RADIOLOGY_QUERY_KEYS.all, "worklist", type] as const,
  schedule: (date: string) => [...RADIOLOGY_QUERY_KEYS.all, "schedule", date] as const,
  roomSchedule: (roomId: string, date: string) =>
    [...RADIOLOGY_QUERY_KEYS.all, "schedule", "room", roomId, date] as const,
  dashboard: () => [...RADIOLOGY_QUERY_KEYS.all, "dashboard"] as const,
};

interface ExamTypeQueryParams {
  modality?: Modality;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

interface OrderQueryParams {
  status?: string;
  urgency?: string;
  modality?: Modality;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ============ EXAM TYPES (CATALOG) ============

/**
 * Get all radiology exam types
 */
export function useRadiologyExamTypes(params?: ExamTypeQueryParams) {
  return useQuery({
    queryKey: [...RADIOLOGY_QUERY_KEYS.examTypes(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.modality) searchParams.set("modality", params.modality);
      if (params?.search) searchParams.set("search", params.search);
      if (params?.isActive !== undefined)
        searchParams.set("is_active", String(params.isActive));
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const url = searchParams.toString()
        ? `${API_ROUTES.DIAGNOSTICS.RADIOLOGY.EXAM_TYPES.LIST}?${searchParams.toString()}`
        : API_ROUTES.DIAGNOSTICS.RADIOLOGY.EXAM_TYPES.LIST;

      const response = await apiClient.get<RadiologyExamTypeListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.examTypes;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a specific exam type
 */
export function useRadiologyExamType(examTypeId: string) {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.examType(examTypeId),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyExamType>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.EXAM_TYPES.GET(examTypeId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!examTypeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Search exam types
 */
export function useRadiologyExamTypeSearch(query: string) {
  return useQuery({
    queryKey: [...RADIOLOGY_QUERY_KEYS.examTypes(), "search", query],
    queryFn: async () => {
      const response = await apiClient.get<RadiologyExamTypeListResponse>(
        `${API_ROUTES.DIAGNOSTICS.RADIOLOGY.EXAM_TYPES.SEARCH}?q=${encodeURIComponent(query)}`
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.examTypes;
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}

// ============ ROOMS ============

/**
 * Get all radiology rooms
 */
export function useRadiologyRooms(modality?: Modality) {
  return useQuery({
    queryKey: modality
      ? RADIOLOGY_QUERY_KEYS.roomsByModality(modality)
      : RADIOLOGY_QUERY_KEYS.rooms(),
    queryFn: async () => {
      const url = modality
        ? API_ROUTES.DIAGNOSTICS.RADIOLOGY.ROOMS.BY_MODALITY(modality)
        : API_ROUTES.DIAGNOSTICS.RADIOLOGY.ROOMS.LIST;

      const response = await apiClient.get<RadiologyRoomListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.rooms;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Get a specific room
 */
export function useRadiologyRoom(roomId: string) {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.room(roomId),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyRoom>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.ROOMS.GET(roomId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!roomId,
    staleTime: 60 * 1000,
  });
}

// ============ ORDERS ============

/**
 * Get radiology orders
 */
export function useRadiologyOrders(params?: OrderQueryParams) {
  return useQuery({
    queryKey: [...RADIOLOGY_QUERY_KEYS.orders(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      if (params?.urgency) searchParams.set("urgency", params.urgency);
      if (params?.modality) searchParams.set("modality", params.modality);
      if (params?.fromDate) searchParams.set("from_date", params.fromDate);
      if (params?.toDate) searchParams.set("to_date", params.toDate);
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const url = searchParams.toString()
        ? `${API_ROUTES.DIAGNOSTICS.RADIOLOGY.ORDERS.LIST}?${searchParams.toString()}`
        : API_ROUTES.DIAGNOSTICS.RADIOLOGY.ORDERS.LIST;

      const response = await apiClient.get<RadiologyOrderListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.orders;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get pending radiology orders
 */
export function usePendingRadiologyOrders() {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.pendingOrders(),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyOrderListResponse>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.ORDERS.PENDING
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.orders;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get a specific radiology order
 */
export function useRadiologyOrder(orderId: string) {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.order(orderId),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyOrder>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.ORDERS.GET(orderId)
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
 * Get patient's radiology orders
 */
export function usePatientRadiologyOrders(patientId: string) {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.ordersByPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyOrderListResponse>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.ORDERS.BY_PATIENT(patientId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.orders;
    },
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });
}

/**
 * Create a radiology order
 */
export function useCreateRadiologyOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateRadiologyOrderRequest) => {
      const response = await apiClient.post<RadiologyOrder>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.ORDERS.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.orders() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.pendingOrders() });
      queryClient.invalidateQueries({
        queryKey: RADIOLOGY_QUERY_KEYS.ordersByPatient(data.patientId),
      });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Cancel a radiology order
 */
export function useCancelRadiologyOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post<RadiologyOrder>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.ORDERS.CANCEL(orderId),
        {}
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.order(orderId) });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.orders() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.pendingOrders() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.dashboard() });
    },
  });
}

// ============ EXAMS ============

/**
 * Get today's radiology exams
 */
export function useTodayRadiologyExams() {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.todayExams(),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyExamListResponse>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.EXAMS.TODAY
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.exams;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get in-progress radiology exams
 */
export function useInProgressRadiologyExams() {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.inProgressExams(),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyExamListResponse>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.EXAMS.IN_PROGRESS
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.exams;
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Get a specific radiology exam
 */
export function useRadiologyExam(examId: string) {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.exam(examId),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyExam>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.EXAMS.GET(examId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!examId,
    staleTime: 30 * 1000,
  });
}

/**
 * Schedule a radiology exam
 */
export function useScheduleRadiologyExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderExamId,
      data,
    }: {
      orderExamId: string;
      data: Omit<ScheduleExamRequest, "orderExamId">;
    }) => {
      const response = await apiClient.post<RadiologyExam>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.EXAMS.SCHEDULE(orderExamId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.exams() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.todayExams() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.pendingOrders() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Start a radiology exam
 */
export function useStartRadiologyExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      examId,
      data,
    }: {
      examId: string;
      data: Omit<StartExamRequest, "examId">;
    }) => {
      const response = await apiClient.post<RadiologyExam>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.EXAMS.START(examId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { examId }) => {
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.exam(examId) });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.exams() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.todayExams() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.inProgressExams() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Complete a radiology exam
 */
export function useCompleteRadiologyExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      examId,
      data,
    }: {
      examId: string;
      data: Omit<CompleteExamRequest, "examId">;
    }) => {
      const response = await apiClient.post<RadiologyExam>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.EXAMS.COMPLETE(examId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { examId }) => {
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.exam(examId) });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.exams() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.todayExams() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.inProgressExams() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.pendingReports() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.dashboard() });
    },
  });
}

// ============ REPORTS ============

/**
 * Get pending radiology reports
 */
export function usePendingRadiologyReports() {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.pendingReports(),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyReportListResponse>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.REPORTS.PENDING
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.reports;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get critical radiology reports
 */
export function useCriticalRadiologyReports() {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.criticalReports(),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyReportListResponse>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.REPORTS.CRITICAL
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.reports;
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Get a specific radiology report
 */
export function useRadiologyReport(reportId: string) {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.report(reportId),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyReport>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.REPORTS.GET(reportId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!reportId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get patient's radiology reports
 */
export function usePatientRadiologyReports(patientId: string) {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.reportsByPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyReportListResponse>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.REPORTS.BY_PATIENT(patientId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.reports;
    },
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });
}

/**
 * Create a radiology report
 */
export function useCreateRadiologyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      examId,
      data,
    }: {
      examId: string;
      data: Omit<CreateReportRequest, "examId">;
    }) => {
      const response = await apiClient.post<RadiologyReport>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.REPORTS.CREATE(examId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.reports() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.pendingReports() });
      queryClient.invalidateQueries({
        queryKey: RADIOLOGY_QUERY_KEYS.reportsByPatient(data.patientId),
      });
      if (data.isCritical) {
        queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.criticalReports() });
      }
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Sign a radiology report
 */
export function useSignRadiologyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const response = await apiClient.post<RadiologyReport>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.REPORTS.SIGN(reportId),
        {}
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, reportId) => {
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.report(reportId) });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.reports() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.pendingReports() });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.dashboard() });
    },
  });
}

/**
 * Add addendum to a radiology report
 */
export function useAddRadiologyAddendum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      addendumText,
    }: {
      reportId: string;
      addendumText: string;
    }) => {
      const response = await apiClient.post<RadiologyReport>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.REPORTS.ADDENDUM(reportId),
        { addendumText }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.report(reportId) });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.reports() });
    },
  });
}

/**
 * Notify critical finding
 */
export function useNotifyCriticalFinding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      data,
    }: {
      reportId: string;
      data: Omit<NotifyCriticalFindingRequest, "reportId">;
    }) => {
      const response = await apiClient.post<RadiologyReport>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.REPORTS.NOTIFY_CRITICAL(reportId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.report(reportId) });
      queryClient.invalidateQueries({ queryKey: RADIOLOGY_QUERY_KEYS.criticalReports() });
    },
  });
}

// ============ TEMPLATES ============

/**
 * Get radiology templates
 */
export function useRadiologyTemplates(modality?: Modality) {
  return useQuery({
    queryKey: modality
      ? RADIOLOGY_QUERY_KEYS.templatesByModality(modality)
      : RADIOLOGY_QUERY_KEYS.templates(),
    queryFn: async () => {
      const url = modality
        ? API_ROUTES.DIAGNOSTICS.RADIOLOGY.TEMPLATES.BY_MODALITY(modality)
        : API_ROUTES.DIAGNOSTICS.RADIOLOGY.TEMPLATES.LIST;

      const response = await apiClient.get<{ templates: RadiologyTemplate[] }>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.templates;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============ WORKLIST ============

/**
 * Get scheduling worklist
 */
export function useSchedulingWorklist() {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.worklist("scheduling"),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyWorklist>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.WORKLIST.SCHEDULING
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
 * Get technician worklist
 */
export function useTechnicianWorklist() {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.worklist("technician"),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyWorklist>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.WORKLIST.TECHNICIAN
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
 * Get radiologist worklist
 */
export function useRadiologistWorklist() {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.worklist("radiologist"),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyWorklist>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.WORKLIST.RADIOLOGIST
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// ============ SCHEDULE ============

/**
 * Get radiology schedule for a date
 */
export function useRadiologySchedule(date: string) {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.schedule(date),
    queryFn: async () => {
      const response = await apiClient.get<RadiologySchedule>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.SCHEDULE.GET(date)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!date,
    staleTime: 30 * 1000,
  });
}

// ============ DASHBOARD ============

/**
 * Get radiology dashboard statistics
 */
export function useRadiologyDashboard() {
  return useQuery({
    queryKey: RADIOLOGY_QUERY_KEYS.dashboard(),
    queryFn: async () => {
      const response = await apiClient.get<RadiologyDashboardStats>(
        API_ROUTES.DIAGNOSTICS.RADIOLOGY.DASHBOARD
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

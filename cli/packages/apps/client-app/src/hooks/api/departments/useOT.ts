/**
 * useOT Hook
 * TanStack Query hooks for Operating Theatre management
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  OperatingTheatre,
  Surgery,
  SurgerySummary,
  SurgeryStatus,
  OTListResponse,
  SurgeryListResponse,
  OTAvailabilityResponse,
  OTDashboardStats,
  OTScheduleBoard,
  ScheduleSurgeryRequest,
  UpdateSurgeryStatusRequest,
  CompleteSurgeryRequest,
  RescheduleSurgeryRequest,
} from "@lazarus-life/shared/types/departments";

export const OT_QUERY_KEYS = {
  all: ["departments", "ot"] as const,
  theatres: () => [...OT_QUERY_KEYS.all, "theatres"] as const,
  theatre: (id: string) => [...OT_QUERY_KEYS.all, "theatre", id] as const,
  theatreAvailability: (id: string) =>
    [...OT_QUERY_KEYS.all, "theatre", id, "availability"] as const,
  surgeries: () => [...OT_QUERY_KEYS.all, "surgeries"] as const,
  surgery: (id: string) => [...OT_QUERY_KEYS.all, "surgery", id] as const,
  todaySurgeries: () => [...OT_QUERY_KEYS.all, "surgeries", "today"] as const,
  patientSurgeries: (patientId: string) =>
    [...OT_QUERY_KEYS.all, "patient", patientId, "surgeries"] as const,
  dashboard: () => [...OT_QUERY_KEYS.all, "dashboard"] as const,
  scheduleBoard: () => [...OT_QUERY_KEYS.all, "schedule-board"] as const,
  availability: () => [...OT_QUERY_KEYS.all, "availability"] as const,
};

interface SurgeryQueryParams {
  status?: SurgeryStatus;
  otId?: string;
  surgeonId?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all operating theatres
 */
export function useOperatingTheatres() {
  return useQuery({
    queryKey: OT_QUERY_KEYS.theatres(),
    queryFn: async () => {
      const response = await apiClient.get<OTListResponse>(
        API_ROUTES.DEPARTMENTS.OT.THEATRES.LIST
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Get a specific operating theatre
 */
export function useOperatingTheatre(otId: string) {
  return useQuery({
    queryKey: OT_QUERY_KEYS.theatre(otId),
    queryFn: async () => {
      const response = await apiClient.get<OperatingTheatre>(
        API_ROUTES.DEPARTMENTS.OT.THEATRES.GET(otId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!otId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get OT availability for a specific theatre
 */
export function useOTAvailability(otId: string, date?: string) {
  return useQuery({
    queryKey: [...OT_QUERY_KEYS.theatreAvailability(otId), date],
    queryFn: async () => {
      const url = date
        ? `${API_ROUTES.DEPARTMENTS.OT.THEATRES.AVAILABILITY(otId)}?date=${date}`
        : API_ROUTES.DEPARTMENTS.OT.THEATRES.AVAILABILITY(otId);
      const response = await apiClient.get<OTAvailabilityResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!otId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get all OT availability for a date
 */
export function useAllOTAvailability(date?: string) {
  return useQuery({
    queryKey: [...OT_QUERY_KEYS.availability(), date],
    queryFn: async () => {
      const url = date
        ? `${API_ROUTES.DEPARTMENTS.OT.AVAILABILITY}?date=${date}`
        : API_ROUTES.DEPARTMENTS.OT.AVAILABILITY;
      const response = await apiClient.get<OTAvailabilityResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get surgeries with filters
 */
export function useSurgeries(params?: SurgeryQueryParams) {
  return useQuery({
    queryKey: [...OT_QUERY_KEYS.surgeries(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      if (params?.otId) searchParams.set("ot_id", params.otId);
      if (params?.surgeonId) searchParams.set("surgeon_id", params.surgeonId);
      if (params?.date) searchParams.set("date", params.date);
      if (params?.fromDate) searchParams.set("from_date", params.fromDate);
      if (params?.toDate) searchParams.set("to_date", params.toDate);
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const url = searchParams.toString()
        ? `${API_ROUTES.DEPARTMENTS.OT.SURGERIES.LIST}?${searchParams.toString()}`
        : API_ROUTES.DEPARTMENTS.OT.SURGERIES.LIST;

      const response = await apiClient.get<SurgeryListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get today's surgeries
 */
export function useTodaySurgeries() {
  return useQuery({
    queryKey: OT_QUERY_KEYS.todaySurgeries(),
    queryFn: async () => {
      const response = await apiClient.get<SurgeryListResponse>(
        API_ROUTES.DEPARTMENTS.OT.SURGERIES.TODAY
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

/**
 * Get a specific surgery
 */
export function useSurgery(surgeryId: string) {
  return useQuery({
    queryKey: OT_QUERY_KEYS.surgery(surgeryId),
    queryFn: async () => {
      const response = await apiClient.get<Surgery>(
        API_ROUTES.DEPARTMENTS.OT.SURGERIES.GET(surgeryId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!surgeryId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get patient's surgery history
 */
export function usePatientSurgeries(patientId: string) {
  return useQuery({
    queryKey: OT_QUERY_KEYS.patientSurgeries(patientId),
    queryFn: async () => {
      const response = await apiClient.get<SurgeryListResponse>(
        API_ROUTES.DEPARTMENTS.OT.SURGERIES.BY_PATIENT(patientId)
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
 * Get OT dashboard statistics
 */
export function useOTDashboard() {
  return useQuery({
    queryKey: OT_QUERY_KEYS.dashboard(),
    queryFn: async () => {
      const response = await apiClient.get<OTDashboardStats>(
        API_ROUTES.DEPARTMENTS.OT.DASHBOARD
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get OT schedule board (for display)
 */
export function useOTScheduleBoard(date?: string) {
  return useQuery({
    queryKey: [...OT_QUERY_KEYS.scheduleBoard(), date],
    queryFn: async () => {
      const url = date
        ? `${API_ROUTES.DEPARTMENTS.OT.SCHEDULE_BOARD}?date=${date}`
        : API_ROUTES.DEPARTMENTS.OT.SCHEDULE_BOARD;
      const response = await apiClient.get<OTScheduleBoard>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Schedule a new surgery
 */
export function useScheduleSurgery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ScheduleSurgeryRequest) => {
      const response = await apiClient.post<Surgery>(
        API_ROUTES.DEPARTMENTS.OT.SURGERIES.SCHEDULE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.surgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.todaySurgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.dashboard() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.scheduleBoard() });
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.theatreAvailability(data.otId),
      });
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.patientSurgeries(data.patientId),
      });
    },
  });
}

/**
 * Update surgery status
 */
export function useUpdateSurgeryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      surgeryId,
      data,
    }: {
      surgeryId: string;
      data: UpdateSurgeryStatusRequest;
    }) => {
      const response = await apiClient.post<Surgery>(
        API_ROUTES.DEPARTMENTS.OT.SURGERIES.UPDATE_STATUS(surgeryId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { surgeryId }) => {
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.surgery(surgeryId),
      });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.surgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.todaySurgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.dashboard() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.scheduleBoard() });
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.theatre(data.otId),
      });
    },
  });
}

/**
 * Start a surgery
 */
export function useStartSurgery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (surgeryId: string) => {
      const response = await apiClient.post<Surgery>(
        API_ROUTES.DEPARTMENTS.OT.SURGERIES.START(surgeryId),
        {}
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, surgeryId) => {
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.surgery(surgeryId),
      });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.surgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.todaySurgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.dashboard() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.scheduleBoard() });
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.theatre(data.otId),
      });
    },
  });
}

/**
 * Complete a surgery
 */
export function useCompleteSurgery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      surgeryId,
      data,
    }: {
      surgeryId: string;
      data: CompleteSurgeryRequest;
    }) => {
      const response = await apiClient.post<Surgery>(
        API_ROUTES.DEPARTMENTS.OT.SURGERIES.COMPLETE(surgeryId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { surgeryId }) => {
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.surgery(surgeryId),
      });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.surgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.todaySurgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.dashboard() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.scheduleBoard() });
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.theatre(data.otId),
      });
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.patientSurgeries(data.patientId),
      });
    },
  });
}

/**
 * Cancel a surgery
 */
export function useCancelSurgery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      surgeryId,
      reason,
    }: {
      surgeryId: string;
      reason: string;
    }) => {
      const response = await apiClient.post<Surgery>(
        API_ROUTES.DEPARTMENTS.OT.SURGERIES.CANCEL(surgeryId),
        { reason }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { surgeryId }) => {
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.surgery(surgeryId),
      });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.surgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.todaySurgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.dashboard() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.scheduleBoard() });
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.theatreAvailability(data.otId),
      });
    },
  });
}

/**
 * Reschedule a surgery
 */
export function useRescheduleSurgery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      surgeryId,
      data,
    }: {
      surgeryId: string;
      data: RescheduleSurgeryRequest;
    }) => {
      const response = await apiClient.post<Surgery>(
        API_ROUTES.DEPARTMENTS.OT.SURGERIES.RESCHEDULE(surgeryId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { surgeryId }) => {
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.surgery(surgeryId),
      });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.surgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.todaySurgeries() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.dashboard() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.scheduleBoard() });
      queryClient.invalidateQueries({ queryKey: OT_QUERY_KEYS.availability() });
      queryClient.invalidateQueries({
        queryKey: OT_QUERY_KEYS.theatreAvailability(data.otId),
      });
    },
  });
}

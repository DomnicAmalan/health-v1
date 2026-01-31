/**
 * useOPD Hook
 * TanStack Query hooks for OPD queue management
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  OPDQueueEntry,
  OPDQueueSummary,
  OPDQueueListResponse,
  OPDDashboardStats,
  DoctorQueueView,
  OPDRoomStatus,
  OPDDisplayBoard,
  OPDCheckInRequest,
  OPDCheckInResponse,
  CallNextRequest,
  UpdateQueueStatusRequest,
  QueueStatus,
} from "@lazarus-life/shared/types/departments";

export const OPD_QUERY_KEYS = {
  all: ["departments", "opd"] as const,
  queue: () => [...OPD_QUERY_KEYS.all, "queue"] as const,
  queueByDoctor: (doctorId: string) =>
    [...OPD_QUERY_KEYS.all, "queue", "doctor", doctorId] as const,
  dashboard: () => [...OPD_QUERY_KEYS.all, "dashboard"] as const,
  rooms: () => [...OPD_QUERY_KEYS.all, "rooms"] as const,
  displayBoard: () => [...OPD_QUERY_KEYS.all, "display-board"] as const,
};

interface QueueQueryParams {
  status?: QueueStatus;
  priority?: string;
  departmentId?: string;
  doctorId?: string;
  date?: string;
}

/**
 * Get OPD queue
 */
export function useOPDQueue(params?: QueueQueryParams) {
  return useQuery({
    queryKey: [...OPD_QUERY_KEYS.queue(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      if (params?.priority) searchParams.set("priority", params.priority);
      if (params?.departmentId) searchParams.set("department_id", params.departmentId);
      if (params?.doctorId) searchParams.set("doctor_id", params.doctorId);
      if (params?.date) searchParams.set("date", params.date);

      const url = searchParams.toString()
        ? `${API_ROUTES.DEPARTMENTS.OPD.QUEUE.LIST}?${searchParams.toString()}`
        : API_ROUTES.DEPARTMENTS.OPD.QUEUE.LIST;

      const response = await apiClient.get<OPDQueueListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 10 * 1000, // Refresh frequently for real-time queue
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

/**
 * Get waiting queue only
 */
export function useWaitingQueue(params?: { departmentId?: string; doctorId?: string }) {
  return useOPDQueue({ ...params, status: "waiting" });
}

/**
 * Get doctor's queue
 */
export function useDoctorQueue(doctorId: string) {
  return useQuery({
    queryKey: OPD_QUERY_KEYS.queueByDoctor(doctorId),
    queryFn: async () => {
      const response = await apiClient.get<DoctorQueueView>(
        API_ROUTES.DEPARTMENTS.OPD.QUEUE.BY_DOCTOR(doctorId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!doctorId,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Get OPD dashboard statistics
 */
export function useOPDDashboard() {
  return useQuery({
    queryKey: OPD_QUERY_KEYS.dashboard(),
    queryFn: async () => {
      const response = await apiClient.get<OPDDashboardStats>(
        API_ROUTES.DEPARTMENTS.OPD.DASHBOARD
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get OPD room statuses
 */
export function useOPDRooms() {
  return useQuery({
    queryKey: OPD_QUERY_KEYS.rooms(),
    queryFn: async () => {
      const response = await apiClient.get<{ rooms: OPDRoomStatus[] }>(
        API_ROUTES.DEPARTMENTS.OPD.ROOMS
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.rooms;
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Get OPD display board data (for waiting room screens)
 */
export function useOPDDisplayBoard() {
  return useQuery({
    queryKey: OPD_QUERY_KEYS.displayBoard(),
    queryFn: async () => {
      const response = await apiClient.get<OPDDisplayBoard>(
        API_ROUTES.DEPARTMENTS.OPD.DISPLAY_BOARD
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 5 * 1000, // Refresh very frequently for display
    refetchInterval: 10 * 1000,
  });
}

/**
 * Check in a patient to OPD queue
 */
export function useOPDCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: OPDCheckInRequest) => {
      const response = await apiClient.post<OPDCheckInResponse>(
        API_ROUTES.DEPARTMENTS.OPD.QUEUE.CHECK_IN,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: OPD_QUERY_KEYS.queue() });
      queryClient.invalidateQueries({ queryKey: OPD_QUERY_KEYS.dashboard() });
      if (data.queueEntry.doctorId) {
        queryClient.invalidateQueries({
          queryKey: OPD_QUERY_KEYS.queueByDoctor(data.queueEntry.doctorId),
        });
      }
    },
  });
}

/**
 * Call next patient
 */
export function useCallNextPatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CallNextRequest) => {
      const response = await apiClient.post<OPDQueueEntry>(
        API_ROUTES.DEPARTMENTS.OPD.QUEUE.CALL_NEXT,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (_, request) => {
      queryClient.invalidateQueries({ queryKey: OPD_QUERY_KEYS.queue() });
      queryClient.invalidateQueries({ queryKey: OPD_QUERY_KEYS.rooms() });
      queryClient.invalidateQueries({ queryKey: OPD_QUERY_KEYS.displayBoard() });
      queryClient.invalidateQueries({
        queryKey: OPD_QUERY_KEYS.queueByDoctor(request.doctorId),
      });
    },
  });
}

/**
 * Update queue entry status
 */
export function useUpdateQueueStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      queueId,
      data,
    }: {
      queueId: string;
      data: UpdateQueueStatusRequest;
    }) => {
      const response = await apiClient.post<OPDQueueEntry>(
        API_ROUTES.DEPARTMENTS.OPD.QUEUE.UPDATE_STATUS(queueId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: OPD_QUERY_KEYS.queue() });
      queryClient.invalidateQueries({ queryKey: OPD_QUERY_KEYS.dashboard() });
      queryClient.invalidateQueries({ queryKey: OPD_QUERY_KEYS.displayBoard() });
      if (data.doctorId) {
        queryClient.invalidateQueries({
          queryKey: OPD_QUERY_KEYS.queueByDoctor(data.doctorId),
        });
      }
    },
  });
}

/**
 * Cancel queue entry
 */
export function useCancelQueueEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      queueId,
      reason,
    }: {
      queueId: string;
      reason: string;
    }) => {
      const response = await apiClient.post<OPDQueueEntry>(
        API_ROUTES.DEPARTMENTS.OPD.QUEUE.CANCEL(queueId),
        { reason }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: OPD_QUERY_KEYS.queue() });
      queryClient.invalidateQueries({ queryKey: OPD_QUERY_KEYS.dashboard() });
      if (data.doctorId) {
        queryClient.invalidateQueries({
          queryKey: OPD_QUERY_KEYS.queueByDoctor(data.doctorId),
        });
      }
    },
  });
}

/**
 * Start consultation (mark as in_consultation)
 */
export function useStartConsultation() {
  return useUpdateQueueStatus();
}

/**
 * Complete consultation
 */
export function useCompleteConsultation() {
  return useUpdateQueueStatus();
}

/**
 * useEhrAppointments Hook
 * TanStack Query hooks for EHR appointment data
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/yottadb-client";
import type {
  EhrAppointment,
  CreateEhrAppointmentRequest,
  UpdateEhrAppointmentRequest,
  RescheduleEhrAppointmentRequest,
  CancelEhrAppointmentRequest,
  EhrProviderSchedule,
  EhrPaginatedResponse,
  EhrPagination,
} from "@lazarus-life/shared/types/ehr";

export const EHR_APPOINTMENT_QUERY_KEYS = {
  all: ["ehr", "appointments"] as const,
  byPatient: (patientId: string) => [...EHR_APPOINTMENT_QUERY_KEYS.all, "patient", patientId] as const,
  byProvider: (providerId: string) => [...EHR_APPOINTMENT_QUERY_KEYS.all, "provider", providerId] as const,
  byLocation: (locationId: string) => [...EHR_APPOINTMENT_QUERY_KEYS.all, "location", locationId] as const,
  detail: (id: string) => [...EHR_APPOINTMENT_QUERY_KEYS.all, "detail", id] as const,
  today: () => [...EHR_APPOINTMENT_QUERY_KEYS.all, "today"] as const,
  checkedIn: () => [...EHR_APPOINTMENT_QUERY_KEYS.all, "checked_in"] as const,
  schedule: (providerId: string, date: string) =>
    [...EHR_APPOINTMENT_QUERY_KEYS.all, "schedule", providerId, date] as const,
};

/**
 * Get appointments for a patient
 */
export function useEhrPatientAppointments(patientId: string, pagination?: EhrPagination) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: [...EHR_APPOINTMENT_QUERY_KEYS.byPatient(patientId), pagination],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (pagination?.limit) queryParams.set("limit", String(pagination.limit));
      if (pagination?.offset) queryParams.set("offset", String(pagination.offset));

      const url = `${API_ROUTES.EHR.APPOINTMENTS.BY_PATIENT(patientId)}?${queryParams.toString()}`;
      const response = await yottadbApiClient.get<EhrPaginatedResponse<EhrAppointment>>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_appointments", undefined, { action: "list_by_patient", patientId });
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get appointments for a provider
 */
export function useEhrProviderAppointments(providerId: string, date?: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: [...EHR_APPOINTMENT_QUERY_KEYS.byProvider(providerId), date],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (date) queryParams.set("date", date);

      const url = `${API_ROUTES.EHR.APPOINTMENTS.BY_PROVIDER(providerId)}?${queryParams.toString()}`;
      const response = await yottadbApiClient.get<EhrAppointment[]>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_appointments", undefined, { action: "list_by_provider", providerId, date });
      return response.data;
    },
    enabled: !!providerId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get appointments for a location
 */
export function useEhrLocationAppointments(locationId: string, date?: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: [...EHR_APPOINTMENT_QUERY_KEYS.byLocation(locationId), date],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (date) queryParams.set("date", date);

      const url = `${API_ROUTES.EHR.APPOINTMENTS.BY_LOCATION(locationId)}?${queryParams.toString()}`;
      const response = await yottadbApiClient.get<EhrAppointment[]>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_appointments", undefined, { action: "list_by_location", locationId, date });
      return response.data;
    },
    enabled: !!locationId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get single appointment by ID
 */
export function useEhrAppointment(id: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_APPOINTMENT_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const response = await yottadbApiClient.get<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.GET(id));

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_appointments", id, { action: "view" });
      return response.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Get today's appointments
 */
export function useEhrTodayAppointments() {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_APPOINTMENT_QUERY_KEYS.today(),
    queryFn: async () => {
      const response = await yottadbApiClient.get<EhrAppointment[]>(API_ROUTES.EHR.APPOINTMENTS.TODAY);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_appointments", undefined, { action: "list_today" });
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
}

/**
 * Get checked-in appointments
 */
export function useEhrCheckedInAppointments() {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_APPOINTMENT_QUERY_KEYS.checkedIn(),
    queryFn: async () => {
      const response = await yottadbApiClient.get<EhrAppointment[]>(API_ROUTES.EHR.APPOINTMENTS.CHECKED_IN);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("ehr_appointments", undefined, { action: "list_checked_in" });
      return response.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Get provider schedule for a day
 */
export function useEhrProviderSchedule(providerId: string, date: string) {
  return useQuery({
    queryKey: EHR_APPOINTMENT_QUERY_KEYS.schedule(providerId, date),
    queryFn: async () => {
      const url = `${API_ROUTES.EHR.APPOINTMENTS.SCHEDULE}?providerId=${providerId}&date=${date}`;
      const response = await yottadbApiClient.get<EhrProviderSchedule>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      return response.data;
    },
    enabled: !!providerId && !!date,
    staleTime: 60 * 1000,
  });
}

/**
 * Create appointment mutation
 */
export function useCreateEhrAppointment() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (appointment: CreateEhrAppointmentRequest) => {
      const response = await yottadbApiClient.post<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.CREATE, appointment);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("CREATE", "ehr_appointments", response.data.id, { action: "create" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byPatient(data.patientId) });
      if (data.providerId) {
        queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byProvider(data.providerId) });
      }
      if (data.locationId) {
        queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byLocation(data.locationId) });
      }
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.today() });
    },
  });
}

/**
 * Update appointment mutation
 */
export function useUpdateEhrAppointment() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (appointment: UpdateEhrAppointmentRequest) => {
      const { id, ...updates } = appointment;
      const response = await yottadbApiClient.put<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.UPDATE(id), updates);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_appointments", id, { action: "update" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byPatient(data.patientId) });
      if (data.providerId) {
        queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byProvider(data.providerId) });
      }
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.today() });
    },
  });
}

/**
 * Check-in appointment mutation
 */
export function useCheckInEhrAppointment() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await yottadbApiClient.post<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.CHECK_IN(id), {});

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_appointments", id, { action: "check_in" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byPatient(data.patientId) });
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.today() });
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.checkedIn() });
    },
  });
}

/**
 * Cancel appointment mutation
 */
export function useCancelEhrAppointment() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, reason }: CancelEhrAppointmentRequest) => {
      const response = await yottadbApiClient.post<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.CANCEL(id), { reason });

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_appointments", id, { action: "cancel" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byPatient(data.patientId) });
      if (data.providerId) {
        queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byProvider(data.providerId) });
      }
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.today() });
    },
  });
}

/**
 * Reschedule appointment mutation
 */
export function useRescheduleEhrAppointment() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, newDatetime, reason }: RescheduleEhrAppointmentRequest) => {
      const response = await yottadbApiClient.post<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.RESCHEDULE(id), {
        newDatetime,
        reason,
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_appointments", id, { action: "reschedule" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byPatient(data.patientId) });
      if (data.providerId) {
        queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byProvider(data.providerId) });
      }
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.today() });
    },
  });
}

/**
 * Mark appointment as no-show mutation
 */
export function useNoShowEhrAppointment() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await yottadbApiClient.post<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.NO_SHOW(id), {});

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "ehr_appointments", id, { action: "no_show" });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byPatient(data.patientId) });
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.today() });
    },
  });
}

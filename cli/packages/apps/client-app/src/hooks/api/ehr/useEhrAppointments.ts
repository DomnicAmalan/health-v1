/**
 * useEhrAppointments Hook
 * TanStack Query hooks for EHR appointment data
 * ✨ Now with Zod runtime validation
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/yottadb-client";
import { z } from "zod";
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
import {
  EhrAppointmentSchema,
  CreateEhrAppointmentRequestSchema,
  UpdateEhrAppointmentRequestSchema,
  CancelEhrAppointmentRequestSchema,
  RescheduleEhrAppointmentRequestSchema,
} from "@lazarus-life/shared/schemas/ehr/appointment";
import { createQueryKeyFactory, unwrapApiResponse, buildQueryParams } from "@lazarus-life/shared";

// ✨ DRY: Using query key factory with custom appointment-specific keys
export const EHR_APPOINTMENT_QUERY_KEYS = {
  ...createQueryKeyFactory("ehr", "appointments"),
  byPatient: (patientId: string) => ["ehr", "appointments", "patient", patientId] as const,
  byProvider: (providerId: string) => ["ehr", "appointments", "provider", providerId] as const,
  byLocation: (locationId: string) => ["ehr", "appointments", "location", locationId] as const,
  today: () => ["ehr", "appointments", "today"] as const,
  checkedIn: () => ["ehr", "appointments", "checked_in"] as const,
  schedule: (providerId: string, date: string) =>
    ["ehr", "appointments", "schedule", providerId, date] as const,
};

/**
 * Get appointments for a patient
 */
export function useEhrPatientAppointments(patientId: string, pagination?: EhrPagination) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: [...EHR_APPOINTMENT_QUERY_KEYS.byPatient(patientId), pagination],
    queryFn: async () => {
      // ✨ DRY: Using buildQueryParams instead of manual construction
      const queryString = buildQueryParams({
        limit: pagination?.limit,
        offset: pagination?.offset,
      });

      const url = `${API_ROUTES.EHR.APPOINTMENTS.BY_PATIENT(patientId)}${queryString}`;
      const response = await apiClient.get<EhrPaginatedResponse<EhrAppointment>>(url, {
        validateResponse: z.object({
          items: z.array(EhrAppointmentSchema),
          total: z.number(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        }),
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);
      logPHI("ehr_appointments", undefined, { action: "list_by_patient", patientId });
      return data;
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
      const queryString = buildQueryParams({ date });
      const url = `${API_ROUTES.EHR.APPOINTMENTS.BY_PROVIDER(providerId)}${queryString}`;
      const response = await apiClient.get<EhrAppointment[]>(url, {
        validateResponse: z.array(EhrAppointmentSchema),
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);
      logPHI("ehr_appointments", undefined, { action: "list_by_provider", providerId, date });
      return data;
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
      const queryString = buildQueryParams({ date });
      const url = `${API_ROUTES.EHR.APPOINTMENTS.BY_LOCATION(locationId)}${queryString}`;
      const response = await apiClient.get<EhrAppointment[]>(url, {
        validateResponse: z.array(EhrAppointmentSchema),
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);
      logPHI("ehr_appointments", undefined, { action: "list_by_location", locationId, date });
      return data;
    },
    enabled: !!locationId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get single appointment by ID
 * ✨ With Zod validation
 */
export function useEhrAppointment(id: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: EHR_APPOINTMENT_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.GET(id), {
        validateResponse: EhrAppointmentSchema,
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);

      logPHI("ehr_appointments", id, { action: "view" });
      return data;
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
      const response = await apiClient.get<EhrAppointment[]>(API_ROUTES.EHR.APPOINTMENTS.TODAY, {
        validateResponse: z.array(EhrAppointmentSchema),
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);

      logPHI("ehr_appointments", undefined, { action: "list_today" });
      return data;
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
      const response = await apiClient.get<EhrAppointment[]>(API_ROUTES.EHR.APPOINTMENTS.CHECKED_IN, {
        validateResponse: z.array(EhrAppointmentSchema),
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);

      logPHI("ehr_appointments", undefined, { action: "list_checked_in" });
      return data;
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
      // ✨ DRY: Using buildQueryParams
      const queryString = buildQueryParams({ providerId, date });
      const url = `${API_ROUTES.EHR.APPOINTMENTS.SCHEDULE}${queryString}`;
      const response = await apiClient.get<EhrProviderSchedule>(url);

      return unwrapApiResponse(response);
    },
    enabled: !!providerId && !!date,
    staleTime: 60 * 1000,
  });
}

/**
 * Create appointment mutation
 * ✨ With Zod validation
 */
export function useCreateEhrAppointment() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (appointment: CreateEhrAppointmentRequest) => {
      const response = await apiClient.post<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.CREATE, {
        body: appointment,
        validateRequest: CreateEhrAppointmentRequestSchema,
        validateResponse: EhrAppointmentSchema,
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);

      logState("CREATE", "ehr_appointments", data.id, { action: "create" });
      return data;
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
      const response = await apiClient.put<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.UPDATE(id), {
        body: updates,
        validateRequest: UpdateEhrAppointmentRequestSchema,
        validateResponse: EhrAppointmentSchema,
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);

      logState("UPDATE", "ehr_appointments", id, { action: "update" });
      return data;
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
      const response = await apiClient.post<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.CHECK_IN(id), {
        body: {},
        validateResponse: EhrAppointmentSchema,
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);

      logState("UPDATE", "ehr_appointments", id, { action: "check_in" });
      return data;
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
 * ✨ With Zod validation
 */
export function useCancelEhrAppointment() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, reason }: CancelEhrAppointmentRequest) => {
      const response = await apiClient.post<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.CANCEL(id), {
        body: { reason },
        validateRequest: CancelEhrAppointmentRequestSchema,
        validateResponse: EhrAppointmentSchema,
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);

      logState("UPDATE", "ehr_appointments", id, { action: "cancel" });
      return data;
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
      const response = await apiClient.post<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.RESCHEDULE(id), {
        body: { newDatetime, reason },
        validateRequest: RescheduleEhrAppointmentRequestSchema,
        validateResponse: EhrAppointmentSchema,
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);

      logState("UPDATE", "ehr_appointments", id, { action: "reschedule" });
      return data;
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
      const response = await apiClient.post<EhrAppointment>(API_ROUTES.EHR.APPOINTMENTS.NO_SHOW(id), {
        body: {},
        validateResponse: EhrAppointmentSchema,
        throwOnValidationError: true,
      });

      const data = unwrapApiResponse(response);

      logState("UPDATE", "ehr_appointments", id, { action: "no_show" });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.byPatient(data.patientId) });
      queryClient.invalidateQueries({ queryKey: EHR_APPOINTMENT_QUERY_KEYS.today() });
    },
  });
}

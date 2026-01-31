/**
 * useIPD Hook
 * TanStack Query hooks for IPD admission management
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  Admission,
  AdmissionSummary,
  AdmissionStatus,
  AdmissionListResponse,
  IPDCensus,
  IPDDashboardStats,
  DischargeSummaryDocument,
  CreateAdmissionRequest,
  DischargeRequest,
  TransferRequest,
  WardTransfer,
} from "@lazarus-life/shared/types/departments";
import { BED_QUERY_KEYS } from "./useBeds";
import { WARD_QUERY_KEYS } from "./useWards";

export const IPD_QUERY_KEYS = {
  all: ["departments", "ipd"] as const,
  admissions: () => [...IPD_QUERY_KEYS.all, "admissions"] as const,
  admission: (id: string) => [...IPD_QUERY_KEYS.all, "admission", id] as const,
  byPatient: (patientId: string) =>
    [...IPD_QUERY_KEYS.all, "patient", patientId] as const,
  currentAdmission: (patientId: string) =>
    [...IPD_QUERY_KEYS.all, "patient", patientId, "current"] as const,
  census: () => [...IPD_QUERY_KEYS.all, "census"] as const,
  dashboard: () => [...IPD_QUERY_KEYS.all, "dashboard"] as const,
  pendingDischarges: () => [...IPD_QUERY_KEYS.all, "pending-discharges"] as const,
  dischargeSummary: (id: string) =>
    [...IPD_QUERY_KEYS.all, "discharge-summary", id] as const,
};

interface AdmissionQueryParams {
  status?: AdmissionStatus;
  wardId?: string;
  doctorId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all admissions with filters
 */
export function useAdmissions(params?: AdmissionQueryParams) {
  return useQuery({
    queryKey: [...IPD_QUERY_KEYS.admissions(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      if (params?.wardId) searchParams.set("ward_id", params.wardId);
      if (params?.doctorId) searchParams.set("doctor_id", params.doctorId);
      if (params?.fromDate) searchParams.set("from_date", params.fromDate);
      if (params?.toDate) searchParams.set("to_date", params.toDate);
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const url = searchParams.toString()
        ? `${API_ROUTES.DEPARTMENTS.IPD.ADMISSIONS.LIST}?${searchParams.toString()}`
        : API_ROUTES.DEPARTMENTS.IPD.ADMISSIONS.LIST;

      const response = await apiClient.get<AdmissionListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get current (active) admissions only
 */
export function useActiveAdmissions(params?: Omit<AdmissionQueryParams, "status">) {
  return useAdmissions({ ...params, status: "admitted" });
}

/**
 * Get a specific admission by ID
 */
export function useAdmission(admissionId: string) {
  return useQuery({
    queryKey: IPD_QUERY_KEYS.admission(admissionId),
    queryFn: async () => {
      const response = await apiClient.get<Admission>(
        API_ROUTES.DEPARTMENTS.IPD.ADMISSIONS.GET(admissionId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!admissionId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get patient's admission history
 */
export function usePatientAdmissions(patientId: string) {
  return useQuery({
    queryKey: IPD_QUERY_KEYS.byPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<AdmissionListResponse>(
        API_ROUTES.DEPARTMENTS.IPD.ADMISSIONS.BY_PATIENT(patientId)
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
 * Get patient's current admission (if any)
 */
export function useCurrentAdmission(patientId: string) {
  return useQuery({
    queryKey: IPD_QUERY_KEYS.currentAdmission(patientId),
    queryFn: async () => {
      const response = await apiClient.get<Admission | null>(
        API_ROUTES.DEPARTMENTS.IPD.ADMISSIONS.CURRENT(patientId)
      );
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get IPD census
 */
export function useIPDCensus() {
  return useQuery({
    queryKey: IPD_QUERY_KEYS.census(),
    queryFn: async () => {
      const response = await apiClient.get<IPDCensus>(
        API_ROUTES.DEPARTMENTS.IPD.CENSUS
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get IPD dashboard statistics
 */
export function useIPDDashboard() {
  return useQuery({
    queryKey: IPD_QUERY_KEYS.dashboard(),
    queryFn: async () => {
      const response = await apiClient.get<IPDDashboardStats>(
        API_ROUTES.DEPARTMENTS.IPD.DASHBOARD
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Get pending discharges
 */
export function usePendingDischarges() {
  return useQuery({
    queryKey: IPD_QUERY_KEYS.pendingDischarges(),
    queryFn: async () => {
      const response = await apiClient.get<{ admissions: AdmissionSummary[] }>(
        API_ROUTES.DEPARTMENTS.IPD.PENDING_DISCHARGES
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.admissions;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get discharge summary document
 */
export function useDischargeSummary(admissionId: string) {
  return useQuery({
    queryKey: IPD_QUERY_KEYS.dischargeSummary(admissionId),
    queryFn: async () => {
      const response = await apiClient.get<DischargeSummaryDocument>(
        API_ROUTES.DEPARTMENTS.IPD.DISCHARGE_SUMMARY(admissionId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!admissionId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new admission
 */
export function useCreateAdmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateAdmissionRequest) => {
      const response = await apiClient.post<Admission>(
        API_ROUTES.DEPARTMENTS.IPD.ADMISSIONS.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: IPD_QUERY_KEYS.admissions() });
      queryClient.invalidateQueries({ queryKey: IPD_QUERY_KEYS.census() });
      queryClient.invalidateQueries({ queryKey: IPD_QUERY_KEYS.dashboard() });
      queryClient.invalidateQueries({
        queryKey: IPD_QUERY_KEYS.byPatient(data.patientId),
      });
      queryClient.invalidateQueries({
        queryKey: IPD_QUERY_KEYS.currentAdmission(data.patientId),
      });
      // Invalidate bed queries
      queryClient.invalidateQueries({ queryKey: BED_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: WARD_QUERY_KEYS.allCensus() });
    },
  });
}

/**
 * Discharge a patient
 */
export function useDischargePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      admissionId,
      data,
    }: {
      admissionId: string;
      data: DischargeRequest;
    }) => {
      const response = await apiClient.post<Admission>(
        API_ROUTES.DEPARTMENTS.IPD.ADMISSIONS.DISCHARGE(admissionId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { admissionId }) => {
      queryClient.invalidateQueries({
        queryKey: IPD_QUERY_KEYS.admission(admissionId),
      });
      queryClient.invalidateQueries({ queryKey: IPD_QUERY_KEYS.admissions() });
      queryClient.invalidateQueries({ queryKey: IPD_QUERY_KEYS.census() });
      queryClient.invalidateQueries({ queryKey: IPD_QUERY_KEYS.dashboard() });
      queryClient.invalidateQueries({
        queryKey: IPD_QUERY_KEYS.pendingDischarges(),
      });
      queryClient.invalidateQueries({
        queryKey: IPD_QUERY_KEYS.byPatient(data.patientId),
      });
      queryClient.invalidateQueries({
        queryKey: IPD_QUERY_KEYS.currentAdmission(data.patientId),
      });
      // Invalidate bed queries
      queryClient.invalidateQueries({ queryKey: BED_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: WARD_QUERY_KEYS.allCensus() });
    },
  });
}

/**
 * Transfer patient to different ward/bed
 */
export function useTransferPatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      admissionId,
      data,
    }: {
      admissionId: string;
      data: TransferRequest;
    }) => {
      const response = await apiClient.post<WardTransfer>(
        API_ROUTES.DEPARTMENTS.IPD.ADMISSIONS.TRANSFER(admissionId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (_, { admissionId }) => {
      queryClient.invalidateQueries({
        queryKey: IPD_QUERY_KEYS.admission(admissionId),
      });
      queryClient.invalidateQueries({ queryKey: IPD_QUERY_KEYS.census() });
      queryClient.invalidateQueries({ queryKey: BED_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: WARD_QUERY_KEYS.allCensus() });
    },
  });
}

/**
 * usePrescriptions Hook
 * TanStack Query hooks for prescription workflow (pharmacist operations)
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/client";
import type {
  Prescription,
  PrescriptionsResponse,
  CreatePrescriptionRequest,
  VerifyPrescriptionRequest,
  DispensePrescriptionRequest,
  PrescriptionActionResponse,
} from "@lazarus-life/shared/types/ehr";

export const PRESCRIPTION_QUERY_KEYS = {
  all: ["pharmacy", "prescriptions"] as const,
  list: () => [...PRESCRIPTION_QUERY_KEYS.all, "list"] as const,
  detail: (id: string) => [...PRESCRIPTION_QUERY_KEYS.all, "detail", id] as const,
  byPatient: (patientId: string) =>
    [...PRESCRIPTION_QUERY_KEYS.all, "patient", patientId] as const,
  pending: () => [...PRESCRIPTION_QUERY_KEYS.all, "pending"] as const,
  ready: () => [...PRESCRIPTION_QUERY_KEYS.all, "ready"] as const,
};

/**
 * Get all prescriptions
 */
export function usePrescriptions() {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: PRESCRIPTION_QUERY_KEYS.list(),
    queryFn: async () => {
      const response = await apiClient.get<PrescriptionsResponse>(
        API_ROUTES.PHARMACY.PRESCRIPTIONS.LIST
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("pharmacy_prescriptions", undefined, { action: "list" });
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get a specific prescription by ID
 */
export function usePrescription(prescriptionId: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: PRESCRIPTION_QUERY_KEYS.detail(prescriptionId),
    queryFn: async () => {
      const response = await apiClient.get<Prescription>(
        API_ROUTES.PHARMACY.PRESCRIPTIONS.GET(prescriptionId)
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("pharmacy_prescriptions", undefined, {
        action: "view",
        prescriptionId,
      });
      return response.data;
    },
    enabled: !!prescriptionId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get prescriptions for a specific patient
 */
export function usePatientPrescriptions(patientId: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: PRESCRIPTION_QUERY_KEYS.byPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<PrescriptionsResponse>(
        API_ROUTES.PHARMACY.PRESCRIPTIONS.BY_PATIENT(patientId)
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("pharmacy_prescriptions", undefined, {
        action: "list_by_patient",
        patientId,
      });
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get pending prescriptions (awaiting pharmacist verification)
 */
export function usePendingPrescriptions() {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: PRESCRIPTION_QUERY_KEYS.pending(),
    queryFn: async () => {
      const response = await apiClient.get<PrescriptionsResponse>(
        API_ROUTES.PHARMACY.PRESCRIPTIONS.PENDING
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("pharmacy_prescriptions", undefined, { action: "list_pending" });
      return response.data;
    },
    staleTime: 10 * 1000, // Refresh pending list more frequently
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

/**
 * Get prescriptions ready for pickup
 */
export function useReadyPrescriptions() {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: PRESCRIPTION_QUERY_KEYS.ready(),
    queryFn: async () => {
      const response = await apiClient.get<PrescriptionsResponse>(
        API_ROUTES.PHARMACY.PRESCRIPTIONS.READY
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("pharmacy_prescriptions", undefined, { action: "list_ready" });
      return response.data;
    },
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Create a new prescription
 */
export function useCreatePrescription() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async (prescription: CreatePrescriptionRequest) => {
      const response = await apiClient.post<Prescription>(
        API_ROUTES.PHARMACY.PRESCRIPTIONS.CREATE,
        prescription
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("CREATE", "pharmacy_prescriptions", String(response.data.ien), {
        action: "create",
        patientIen: prescription.patientIen,
        drugName: prescription.drugName,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.byPatient(String(data.patientIen)),
      });
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.pending(),
      });
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.list(),
      });
    },
  });
}

/**
 * Verify a prescription (pharmacist verification step)
 */
export function useVerifyPrescription() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      prescriptionId,
      verifiedBy,
    }: {
      prescriptionId: string;
      verifiedBy: number;
    }) => {
      const request: VerifyPrescriptionRequest = { verifiedBy };
      const response = await apiClient.post<PrescriptionActionResponse>(
        API_ROUTES.PHARMACY.PRESCRIPTIONS.VERIFY(prescriptionId),
        request
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "pharmacy_prescriptions", prescriptionId, {
        action: "verify",
        verifiedBy,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.detail(variables.prescriptionId),
      });
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.pending(),
      });
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.list(),
      });
    },
  });
}

/**
 * Dispense a prescription
 */
export function useDispensePrescription() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      prescriptionId,
      dispensedBy,
      lotNumber,
      expirationDate,
    }: {
      prescriptionId: string;
      dispensedBy: number;
      lotNumber?: string;
      expirationDate?: string;
    }) => {
      const request: DispensePrescriptionRequest = {
        dispensedBy,
        lotNumber,
        expirationDate,
      };
      const response = await apiClient.post<PrescriptionActionResponse>(
        API_ROUTES.PHARMACY.PRESCRIPTIONS.DISPENSE(prescriptionId),
        request
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "pharmacy_prescriptions", prescriptionId, {
        action: "dispense",
        dispensedBy,
        lotNumber,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.detail(variables.prescriptionId),
      });
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.pending(),
      });
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.ready(),
      });
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.list(),
      });
    },
  });
}

/**
 * Cancel a prescription
 */
export function useCancelPrescription() {
  const queryClient = useQueryClient();
  const { logState } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      prescriptionId,
      reason,
    }: {
      prescriptionId: string;
      reason?: string;
    }) => {
      const response = await apiClient.post<PrescriptionActionResponse>(
        API_ROUTES.PHARMACY.PRESCRIPTIONS.CANCEL(prescriptionId),
        { reason }
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logState("UPDATE", "pharmacy_prescriptions", prescriptionId, {
        action: "cancel",
        reason,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.detail(variables.prescriptionId),
      });
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.pending(),
      });
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.ready(),
      });
      queryClient.invalidateQueries({
        queryKey: PRESCRIPTION_QUERY_KEYS.list(),
      });
    },
  });
}

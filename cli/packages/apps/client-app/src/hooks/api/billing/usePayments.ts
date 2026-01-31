/**
 * usePayments Hook
 * TanStack Query hooks for payment processing
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  Payment,
  PaymentMethod,
  PaymentAllocation,
  CreatePaymentRequest,
  PatientBillingAccount,
  PaymentListResponse,
} from "@lazarus-life/shared/types/billing";
import { INVOICE_QUERY_KEYS } from "./useInvoices";

export const PAYMENT_QUERY_KEYS = {
  all: ["billing", "payments"] as const,
  list: () => [...PAYMENT_QUERY_KEYS.all, "list"] as const,
  detail: (id: string) => [...PAYMENT_QUERY_KEYS.all, "detail", id] as const,
  byPatient: (patientId: string) =>
    [...PAYMENT_QUERY_KEYS.all, "patient", patientId] as const,
  patientBalance: (patientId: string) =>
    ["billing", "patient", patientId, "balance"] as const,
  patientAccount: (patientId: string) =>
    ["billing", "patient", patientId, "account"] as const,
  patientStatements: (patientId: string) =>
    ["billing", "patient", patientId, "statements"] as const,
};

interface PaymentQueryParams {
  page?: number;
  limit?: number;
  patientId?: string;
  method?: PaymentMethod;
  fromDate?: string;
  toDate?: string;
}

/**
 * Get all payments with pagination and filters
 */
export function usePayments(params?: PaymentQueryParams) {
  return useQuery({
    queryKey: [...PAYMENT_QUERY_KEYS.list(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.patientId) searchParams.set("patient_id", params.patientId);
      if (params?.method) searchParams.set("method", params.method);
      if (params?.fromDate) searchParams.set("from_date", params.fromDate);
      if (params?.toDate) searchParams.set("to_date", params.toDate);

      const url = searchParams.toString()
        ? `${API_ROUTES.BILLING.PAYMENTS.LIST}?${searchParams.toString()}`
        : API_ROUTES.BILLING.PAYMENTS.LIST;

      const response = await apiClient.get<PaymentListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get a specific payment by ID
 */
export function usePayment(paymentId: string) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.detail(paymentId),
    queryFn: async () => {
      const response = await apiClient.get<Payment>(
        API_ROUTES.BILLING.PAYMENTS.GET(paymentId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!paymentId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get payments for a specific patient
 */
export function usePatientPayments(patientId: string) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.byPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<PaymentListResponse>(
        API_ROUTES.BILLING.PAYMENTS.BY_PATIENT(patientId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get patient balance
 */
export function usePatientBalance(patientId: string) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.patientBalance(patientId),
    queryFn: async () => {
      const response = await apiClient.get<{
        totalDue: number;
        totalPaid: number;
        balance: number;
        currencyCode: string;
      }>(API_ROUTES.BILLING.PATIENTS.BALANCE(patientId));
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get patient billing account
 */
export function usePatientBillingAccount(patientId: string) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.patientAccount(patientId),
    queryFn: async () => {
      const response = await apiClient.get<PatientBillingAccount>(
        API_ROUTES.BILLING.PATIENTS.ACCOUNT(patientId)
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
 * Get patient statements
 */
export function usePatientStatements(patientId: string) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.patientStatements(patientId),
    queryFn: async () => {
      const response = await apiClient.get<{
        statements: Array<{
          id: string;
          statementDate: string;
          periodStart: string;
          periodEnd: string;
          openingBalance: number;
          charges: number;
          payments: number;
          adjustments: number;
          closingBalance: number;
          pdfUrl?: string;
        }>;
      }>(API_ROUTES.BILLING.PATIENTS.STATEMENTS(patientId));
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.statements;
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new payment
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreatePaymentRequest) => {
      const response = await apiClient.post<Payment>(
        API_ROUTES.BILLING.PAYMENTS.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
      if (data.patientId) {
        queryClient.invalidateQueries({
          queryKey: PAYMENT_QUERY_KEYS.byPatient(data.patientId),
        });
        queryClient.invalidateQueries({
          queryKey: PAYMENT_QUERY_KEYS.patientBalance(data.patientId),
        });
        queryClient.invalidateQueries({
          queryKey: INVOICE_QUERY_KEYS.byPatient(data.patientId),
        });
      }
    },
  });
}

/**
 * Allocate a payment to invoices
 */
export function useAllocatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      allocations,
    }: {
      paymentId: string;
      allocations: Array<{ invoiceId: string; amount: number }>;
    }) => {
      const response = await apiClient.post<{ allocations: PaymentAllocation[] }>(
        API_ROUTES.BILLING.PAYMENTS.ALLOCATE(paymentId),
        { allocations }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (_, { paymentId }) => {
      queryClient.invalidateQueries({
        queryKey: PAYMENT_QUERY_KEYS.detail(paymentId),
      });
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all });
    },
  });
}

/**
 * Refund a payment
 */
export function useRefundPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      amount,
      reason,
    }: {
      paymentId: string;
      amount: number;
      reason: string;
    }) => {
      const response = await apiClient.post<Payment>(
        API_ROUTES.BILLING.PAYMENTS.REFUND(paymentId),
        { amount, reason }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { paymentId }) => {
      queryClient.invalidateQueries({
        queryKey: PAYMENT_QUERY_KEYS.detail(paymentId),
      });
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all });
      if (data.patientId) {
        queryClient.invalidateQueries({
          queryKey: PAYMENT_QUERY_KEYS.byPatient(data.patientId),
        });
        queryClient.invalidateQueries({
          queryKey: PAYMENT_QUERY_KEYS.patientBalance(data.patientId),
        });
      }
    },
  });
}

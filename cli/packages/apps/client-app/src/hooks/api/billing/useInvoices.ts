/**
 * useInvoices Hook
 * TanStack Query hooks for invoice management
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  CreateInvoiceRequest,
  AddInvoiceItemRequest,
  InvoiceListResponse,
} from "@lazarus-life/shared/types/billing";

export const INVOICE_QUERY_KEYS = {
  all: ["billing", "invoices"] as const,
  list: () => [...INVOICE_QUERY_KEYS.all, "list"] as const,
  detail: (id: string) => [...INVOICE_QUERY_KEYS.all, "detail", id] as const,
  byPatient: (patientId: string) =>
    [...INVOICE_QUERY_KEYS.all, "patient", patientId] as const,
  byStatus: (status: InvoiceStatus) =>
    [...INVOICE_QUERY_KEYS.all, "status", status] as const,
};

interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  patientId?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Get all invoices with pagination and filters
 */
export function useInvoices(params?: InvoiceQueryParams) {
  return useQuery({
    queryKey: [...INVOICE_QUERY_KEYS.list(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.status) searchParams.set("status", params.status);
      if (params?.patientId) searchParams.set("patient_id", params.patientId);
      if (params?.fromDate) searchParams.set("from_date", params.fromDate);
      if (params?.toDate) searchParams.set("to_date", params.toDate);

      const url = searchParams.toString()
        ? `${API_ROUTES.BILLING.INVOICES.LIST}?${searchParams.toString()}`
        : API_ROUTES.BILLING.INVOICES.LIST;

      const response = await apiClient.get<InvoiceListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get a specific invoice by ID
 */
export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.detail(invoiceId),
    queryFn: async () => {
      const response = await apiClient.get<Invoice>(
        API_ROUTES.BILLING.INVOICES.GET(invoiceId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!invoiceId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get invoices for a specific patient
 */
export function usePatientInvoices(patientId: string) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.byPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<InvoiceListResponse>(
        API_ROUTES.BILLING.INVOICES.BY_PATIENT(patientId)
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
 * Get pending invoices
 */
export function usePendingInvoices() {
  return useInvoices({ status: "draft" });
}

/**
 * Create a new invoice
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateInvoiceRequest) => {
      const response = await apiClient.post<Invoice>(
        API_ROUTES.BILLING.INVOICES.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all });
      if (data.patientId) {
        queryClient.invalidateQueries({
          queryKey: INVOICE_QUERY_KEYS.byPatient(data.patientId),
        });
      }
    },
  });
}

/**
 * Add an item to an invoice
 */
export function useAddInvoiceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      item,
    }: {
      invoiceId: string;
      item: AddInvoiceItemRequest;
    }) => {
      const response = await apiClient.post<InvoiceItem>(
        API_ROUTES.BILLING.INVOICES.ADD_ITEM(invoiceId),
        item
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({
        queryKey: INVOICE_QUERY_KEYS.detail(invoiceId),
      });
    },
  });
}

/**
 * Finalize an invoice (marks it as ready for payment)
 */
export function useFinalizeInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiClient.post<Invoice>(
        API_ROUTES.BILLING.INVOICES.FINALIZE(invoiceId),
        {}
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, invoiceId) => {
      queryClient.invalidateQueries({
        queryKey: INVOICE_QUERY_KEYS.detail(invoiceId),
      });
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all });
      if (data.patientId) {
        queryClient.invalidateQueries({
          queryKey: INVOICE_QUERY_KEYS.byPatient(data.patientId),
        });
      }
    },
  });
}

/**
 * Cancel an invoice
 */
export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      reason,
    }: {
      invoiceId: string;
      reason: string;
    }) => {
      const response = await apiClient.post<Invoice>(
        API_ROUTES.BILLING.INVOICES.CANCEL(invoiceId),
        { reason }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { invoiceId }) => {
      queryClient.invalidateQueries({
        queryKey: INVOICE_QUERY_KEYS.detail(invoiceId),
      });
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all });
      if (data.patientId) {
        queryClient.invalidateQueries({
          queryKey: INVOICE_QUERY_KEYS.byPatient(data.patientId),
        });
      }
    },
  });
}

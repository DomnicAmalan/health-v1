/**
 * useServices Hook
 * TanStack Query hooks for service catalog management
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  Service,
  ServiceCategory,
  ServicePackage,
  TaxCode,
  CreateServiceRequest,
  ServiceListResponse,
} from "@lazarus-life/shared/types/billing";

export const SERVICE_QUERY_KEYS = {
  all: ["billing", "services"] as const,
  list: () => [...SERVICE_QUERY_KEYS.all, "list"] as const,
  detail: (id: string) => [...SERVICE_QUERY_KEYS.all, "detail", id] as const,
  search: (query: string) => [...SERVICE_QUERY_KEYS.all, "search", query] as const,
  categories: ["billing", "categories"] as const,
  taxCodes: ["billing", "tax-codes"] as const,
  packages: ["billing", "packages"] as const,
};

/**
 * Get all services with pagination
 */
export function useServices(params?: { page?: number; limit?: number; categoryId?: string }) {
  return useQuery({
    queryKey: [...SERVICE_QUERY_KEYS.list(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.categoryId) searchParams.set("category_id", params.categoryId);

      const url = params
        ? `${API_ROUTES.BILLING.SERVICES.LIST}?${searchParams.toString()}`
        : API_ROUTES.BILLING.SERVICES.LIST;

      const response = await apiClient.get<ServiceListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

/**
 * Get a specific service by ID
 */
export function useService(serviceId: string) {
  return useQuery({
    queryKey: SERVICE_QUERY_KEYS.detail(serviceId),
    queryFn: async () => {
      const response = await apiClient.get<Service>(
        API_ROUTES.BILLING.SERVICES.GET(serviceId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Search services by name/code
 */
export function useSearchServices(query: string) {
  return useQuery({
    queryKey: SERVICE_QUERY_KEYS.search(query),
    queryFn: async () => {
      const url = `${API_ROUTES.BILLING.SERVICES.SEARCH}?q=${encodeURIComponent(query)}`;
      const response = await apiClient.get<ServiceListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}

/**
 * Get all service categories
 */
export function useServiceCategories() {
  return useQuery({
    queryKey: SERVICE_QUERY_KEYS.categories,
    queryFn: async () => {
      const response = await apiClient.get<{ categories: ServiceCategory[] }>(
        API_ROUTES.BILLING.CATEGORIES.LIST
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.categories;
    },
    staleTime: 5 * 60 * 1000, // Categories rarely change
  });
}

/**
 * Get all tax codes (HSN/SAC)
 */
export function useTaxCodes() {
  return useQuery({
    queryKey: SERVICE_QUERY_KEYS.taxCodes,
    queryFn: async () => {
      const response = await apiClient.get<{ taxCodes: TaxCode[] }>(
        API_ROUTES.BILLING.TAX_CODES.LIST
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.taxCodes;
    },
    staleTime: 10 * 60 * 1000, // Tax codes rarely change
  });
}

/**
 * Get all service packages
 */
export function useServicePackages() {
  return useQuery({
    queryKey: SERVICE_QUERY_KEYS.packages,
    queryFn: async () => {
      const response = await apiClient.get<{ packages: ServicePackage[] }>(
        API_ROUTES.BILLING.PACKAGES.LIST
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.packages;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new service
 */
export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateServiceRequest) => {
      const response = await apiClient.post<Service>(
        API_ROUTES.BILLING.SERVICES.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.all });
    },
  });
}

/**
 * Create a new service category
 */
export function useCreateServiceCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: { name: string; code: string; description?: string }) => {
      const response = await apiClient.post<ServiceCategory>(
        API_ROUTES.BILLING.CATEGORIES.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.categories });
    },
  });
}

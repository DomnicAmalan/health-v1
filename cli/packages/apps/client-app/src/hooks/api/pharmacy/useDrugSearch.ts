/**
 * useDrugSearch Hook
 * TanStack Query hooks for drug search and details
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/security/useAuditLog";
import { apiClient } from "@/lib/api/client";
import type {
  Drug,
  DrugSearchQuery,
  DrugSearchResponse,
  DrugInteraction,
  DrugContraindication,
} from "@lazarus-life/shared/types/ehr";

export const DRUG_SEARCH_QUERY_KEYS = {
  all: ["pharmacy", "drugs"] as const,
  search: (params: DrugSearchQuery) =>
    [...DRUG_SEARCH_QUERY_KEYS.all, "search", params] as const,
  detail: (id: string) => [...DRUG_SEARCH_QUERY_KEYS.all, "detail", id] as const,
  interactions: (id: string) =>
    [...DRUG_SEARCH_QUERY_KEYS.all, "interactions", id] as const,
  contraindications: (id: string) =>
    [...DRUG_SEARCH_QUERY_KEYS.all, "contraindications", id] as const,
  byCatalog: (catalogId: string) =>
    [...DRUG_SEARCH_QUERY_KEYS.all, "catalog", catalogId] as const,
};

/**
 * Search drugs by query
 */
export function useDrugSearch(params: DrugSearchQuery) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: DRUG_SEARCH_QUERY_KEYS.search(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set("q", params.q);
      if (params.catalogId) queryParams.set("catalogId", params.catalogId);
      if (params.isFormulary !== undefined)
        queryParams.set("isFormulary", String(params.isFormulary));
      if (params.therapeuticClass)
        queryParams.set("therapeuticClass", params.therapeuticClass);
      if (params.page) queryParams.set("page", String(params.page));
      if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));

      const url = `${API_ROUTES.PHARMACY.DRUGS.SEARCH}?${queryParams.toString()}`;
      const response = await apiClient.get<DrugSearchResponse>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("pharmacy_drugs", undefined, { action: "search", query: params.q });
      return response.data;
    },
    enabled: params.q.length >= 2, // Only search with 2+ characters
    staleTime: 30 * 1000,
  });
}

/**
 * Get a specific drug by ID
 */
export function useDrug(drugId: string) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: DRUG_SEARCH_QUERY_KEYS.detail(drugId),
    queryFn: async () => {
      const response = await apiClient.get<Drug>(
        API_ROUTES.PHARMACY.DRUGS.GET(drugId)
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      logPHI("pharmacy_drugs", undefined, { action: "view", drugId });
      return response.data;
    },
    enabled: !!drugId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get known interactions for a specific drug
 */
export function useDrugInteractions(drugId: string) {
  return useQuery({
    queryKey: DRUG_SEARCH_QUERY_KEYS.interactions(drugId),
    queryFn: async () => {
      const response = await apiClient.get<DrugInteraction[]>(
        API_ROUTES.PHARMACY.DRUGS.INTERACTIONS(drugId)
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      return response.data;
    },
    enabled: !!drugId,
    staleTime: 5 * 60 * 1000, // Interactions data is relatively static
  });
}

/**
 * Get contraindications for a specific drug
 */
export function useDrugContraindications(drugId: string) {
  return useQuery({
    queryKey: DRUG_SEARCH_QUERY_KEYS.contraindications(drugId),
    queryFn: async () => {
      const response = await apiClient.get<DrugContraindication[]>(
        API_ROUTES.PHARMACY.DRUGS.CONTRAINDICATIONS(drugId)
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      return response.data;
    },
    enabled: !!drugId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get all drugs in a catalog (for browsing formulary)
 */
export function useDrugsByCatalog(
  catalogId: string,
  pagination?: { page?: number; pageSize?: number }
) {
  return useQuery({
    queryKey: [...DRUG_SEARCH_QUERY_KEYS.byCatalog(catalogId), pagination],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (pagination?.page) queryParams.set("page", String(pagination.page));
      if (pagination?.pageSize)
        queryParams.set("pageSize", String(pagination.pageSize));

      const url = queryParams.toString()
        ? `${API_ROUTES.PHARMACY.DRUGS.BY_CATALOG(catalogId)}?${queryParams.toString()}`
        : API_ROUTES.PHARMACY.DRUGS.BY_CATALOG(catalogId);

      const response = await apiClient.get<DrugSearchResponse>(url);

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      return response.data;
    },
    enabled: !!catalogId,
    staleTime: 60 * 1000,
  });
}

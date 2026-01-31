/**
 * useDrugCatalog Hook
 * TanStack Query hooks for drug catalogs and schedules
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  DrugCatalogListResponse,
  DrugCatalogWithSchedules,
  DrugScheduleInfo,
} from "@lazarus-life/shared/types/ehr";

export const DRUG_CATALOG_QUERY_KEYS = {
  all: ["pharmacy", "catalogs"] as const,
  list: () => [...DRUG_CATALOG_QUERY_KEYS.all, "list"] as const,
  detail: (id: string) => [...DRUG_CATALOG_QUERY_KEYS.all, "detail", id] as const,
  schedules: (catalogId: string) =>
    [...DRUG_CATALOG_QUERY_KEYS.all, "schedules", catalogId] as const,
};

/**
 * Get all drug catalogs
 */
export function useDrugCatalogs() {
  return useQuery({
    queryKey: DRUG_CATALOG_QUERY_KEYS.list(),
    queryFn: async () => {
      const response = await apiClient.get<DrugCatalogListResponse>(
        API_ROUTES.PHARMACY.CATALOGS.LIST
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Catalogs rarely change, cache for 5 minutes
  });
}

/**
 * Get a specific drug catalog by ID
 */
export function useDrugCatalog(catalogId: string) {
  return useQuery({
    queryKey: DRUG_CATALOG_QUERY_KEYS.detail(catalogId),
    queryFn: async () => {
      const response = await apiClient.get<DrugCatalogWithSchedules>(
        API_ROUTES.PHARMACY.CATALOGS.GET(catalogId)
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      return response.data;
    },
    enabled: !!catalogId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get schedules for a specific drug catalog
 */
export function useDrugSchedules(catalogId: string) {
  return useQuery({
    queryKey: DRUG_CATALOG_QUERY_KEYS.schedules(catalogId),
    queryFn: async () => {
      const response = await apiClient.get<DrugScheduleInfo[]>(
        API_ROUTES.PHARMACY.CATALOGS.SCHEDULES(catalogId)
      );

      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");

      return response.data;
    },
    enabled: !!catalogId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get the active/primary catalog for the current jurisdiction
 */
export function useActiveDrugCatalog() {
  const { data: catalogs, ...rest } = useDrugCatalogs();

  const activeCatalog = catalogs?.data.find(
    (catalog) => catalog.isPrimary && catalog.isActive
  );

  return {
    data: activeCatalog,
    ...rest,
  };
}

/**
 * useWards Hook
 * TanStack Query hooks for ward management
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  Ward,
  WardCensus,
  WardListResponse,
  WardCensusResponse,
  CreateWardRequest,
  UpdateWardRequest,
} from "@lazarus-life/shared/types/departments";
import type { Bed } from "@lazarus-life/shared/types/departments";

export const WARD_QUERY_KEYS = {
  all: ["departments", "wards"] as const,
  list: () => [...WARD_QUERY_KEYS.all, "list"] as const,
  detail: (id: string) => [...WARD_QUERY_KEYS.all, "detail", id] as const,
  census: (id: string) => [...WARD_QUERY_KEYS.all, "census", id] as const,
  beds: (id: string) => [...WARD_QUERY_KEYS.all, "beds", id] as const,
  allCensus: () => [...WARD_QUERY_KEYS.all, "all-census"] as const,
};

/**
 * Get all wards
 */
export function useWards(params?: { specialty?: string; status?: string }) {
  return useQuery({
    queryKey: [...WARD_QUERY_KEYS.list(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.specialty) searchParams.set("specialty", params.specialty);
      if (params?.status) searchParams.set("status", params.status);

      const url = searchParams.toString()
        ? `${API_ROUTES.DEPARTMENTS.WARDS.LIST}?${searchParams.toString()}`
        : API_ROUTES.DEPARTMENTS.WARDS.LIST;

      const response = await apiClient.get<WardListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Get a specific ward by ID
 */
export function useWard(wardId: string) {
  return useQuery({
    queryKey: WARD_QUERY_KEYS.detail(wardId),
    queryFn: async () => {
      const response = await apiClient.get<Ward>(
        API_ROUTES.DEPARTMENTS.WARDS.GET(wardId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!wardId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get ward census
 */
export function useWardCensus(wardId: string) {
  return useQuery({
    queryKey: WARD_QUERY_KEYS.census(wardId),
    queryFn: async () => {
      const response = await apiClient.get<WardCensus>(
        API_ROUTES.DEPARTMENTS.WARDS.CENSUS(wardId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!wardId,
    staleTime: 30 * 1000, // Refresh more frequently
  });
}

/**
 * Get all wards census (hospital-wide)
 */
export function useAllWardsCensus() {
  return useQuery({
    queryKey: WARD_QUERY_KEYS.allCensus(),
    queryFn: async () => {
      const response = await apiClient.get<WardCensusResponse>(
        API_ROUTES.DEPARTMENTS.WARDS.ALL_CENSUS
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get beds in a ward
 */
export function useWardBeds(wardId: string) {
  return useQuery({
    queryKey: WARD_QUERY_KEYS.beds(wardId),
    queryFn: async () => {
      const response = await apiClient.get<{ beds: Bed[] }>(
        API_ROUTES.DEPARTMENTS.WARDS.BEDS(wardId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.beds;
    },
    enabled: !!wardId,
    staleTime: 30 * 1000,
  });
}

/**
 * Create a new ward
 */
export function useCreateWard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateWardRequest) => {
      const response = await apiClient.post<Ward>(
        API_ROUTES.DEPARTMENTS.WARDS.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WARD_QUERY_KEYS.all });
    },
  });
}

/**
 * Update a ward
 */
export function useUpdateWard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      wardId,
      data,
    }: {
      wardId: string;
      data: UpdateWardRequest;
    }) => {
      const response = await apiClient.put<Ward>(
        API_ROUTES.DEPARTMENTS.WARDS.UPDATE(wardId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (_, { wardId }) => {
      queryClient.invalidateQueries({
        queryKey: WARD_QUERY_KEYS.detail(wardId),
      });
      queryClient.invalidateQueries({ queryKey: WARD_QUERY_KEYS.list() });
    },
  });
}

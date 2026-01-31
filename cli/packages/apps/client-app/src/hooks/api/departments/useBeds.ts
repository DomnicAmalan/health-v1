/**
 * useBeds Hook
 * TanStack Query hooks for bed management
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  Bed,
  BedStatus,
  BedType,
  BedListResponse,
  BedAvailabilityResponse,
  BedOccupancySummary,
  BedHistoryEntry,
  CreateBedRequest,
  UpdateBedRequest,
  AllocateBedRequest,
  ReleaseBedRequest,
  TransferBedRequest,
} from "@lazarus-life/shared/types/departments";
import { WARD_QUERY_KEYS } from "./useWards";

export const BED_QUERY_KEYS = {
  all: ["departments", "beds"] as const,
  list: () => [...BED_QUERY_KEYS.all, "list"] as const,
  detail: (id: string) => [...BED_QUERY_KEYS.all, "detail", id] as const,
  available: () => [...BED_QUERY_KEYS.all, "available"] as const,
  history: (id: string) => [...BED_QUERY_KEYS.all, "history", id] as const,
  occupancy: () => [...BED_QUERY_KEYS.all, "occupancy"] as const,
};

interface BedQueryParams {
  wardId?: string;
  status?: BedStatus;
  bedType?: BedType;
  page?: number;
  limit?: number;
}

/**
 * Get all beds with filters
 */
export function useBeds(params?: BedQueryParams) {
  return useQuery({
    queryKey: [...BED_QUERY_KEYS.list(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.wardId) searchParams.set("ward_id", params.wardId);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.bedType) searchParams.set("bed_type", params.bedType);
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const url = searchParams.toString()
        ? `${API_ROUTES.DEPARTMENTS.BEDS.LIST}?${searchParams.toString()}`
        : API_ROUTES.DEPARTMENTS.BEDS.LIST;

      const response = await apiClient.get<BedListResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get a specific bed by ID
 */
export function useBed(bedId: string) {
  return useQuery({
    queryKey: BED_QUERY_KEYS.detail(bedId),
    queryFn: async () => {
      const response = await apiClient.get<Bed>(
        API_ROUTES.DEPARTMENTS.BEDS.GET(bedId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!bedId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get available beds
 */
export function useAvailableBeds(params?: { wardId?: string; bedType?: BedType }) {
  return useQuery({
    queryKey: [...BED_QUERY_KEYS.available(), params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.wardId) searchParams.set("ward_id", params.wardId);
      if (params?.bedType) searchParams.set("bed_type", params.bedType);

      const url = searchParams.toString()
        ? `${API_ROUTES.DEPARTMENTS.BEDS.AVAILABLE}?${searchParams.toString()}`
        : API_ROUTES.DEPARTMENTS.BEDS.AVAILABLE;

      const response = await apiClient.get<BedAvailabilityResponse>(url);
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 15 * 1000, // Refresh frequently for real-time availability
  });
}

/**
 * Get bed occupancy summary
 */
export function useBedOccupancy() {
  return useQuery({
    queryKey: BED_QUERY_KEYS.occupancy(),
    queryFn: async () => {
      const response = await apiClient.get<BedOccupancySummary>(
        API_ROUTES.DEPARTMENTS.BEDS.OCCUPANCY
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get bed history
 */
export function useBedHistory(bedId: string) {
  return useQuery({
    queryKey: BED_QUERY_KEYS.history(bedId),
    queryFn: async () => {
      const response = await apiClient.get<{ history: BedHistoryEntry[] }>(
        API_ROUTES.DEPARTMENTS.BEDS.HISTORY(bedId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.history;
    },
    enabled: !!bedId,
    staleTime: 60 * 1000,
  });
}

/**
 * Create a new bed
 */
export function useCreateBed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateBedRequest) => {
      const response = await apiClient.post<Bed>(
        API_ROUTES.DEPARTMENTS.BEDS.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: BED_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: WARD_QUERY_KEYS.beds(data.wardId),
      });
    },
  });
}

/**
 * Update a bed
 */
export function useUpdateBed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bedId,
      data,
    }: {
      bedId: string;
      data: UpdateBedRequest;
    }) => {
      const response = await apiClient.put<Bed>(
        API_ROUTES.DEPARTMENTS.BEDS.UPDATE(bedId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { bedId }) => {
      queryClient.invalidateQueries({
        queryKey: BED_QUERY_KEYS.detail(bedId),
      });
      queryClient.invalidateQueries({ queryKey: BED_QUERY_KEYS.list() });
      queryClient.invalidateQueries({
        queryKey: WARD_QUERY_KEYS.beds(data.wardId),
      });
    },
  });
}

/**
 * Allocate a bed to a patient
 */
export function useAllocateBed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bedId,
      data,
    }: {
      bedId: string;
      data: AllocateBedRequest;
    }) => {
      const response = await apiClient.post<Bed>(
        API_ROUTES.DEPARTMENTS.BEDS.ALLOCATE(bedId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { bedId }) => {
      queryClient.invalidateQueries({
        queryKey: BED_QUERY_KEYS.detail(bedId),
      });
      queryClient.invalidateQueries({ queryKey: BED_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: WARD_QUERY_KEYS.allCensus() });
      queryClient.invalidateQueries({
        queryKey: WARD_QUERY_KEYS.census(data.wardId),
      });
    },
  });
}

/**
 * Release a bed
 */
export function useReleaseBed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bedId,
      data,
    }: {
      bedId: string;
      data: ReleaseBedRequest;
    }) => {
      const response = await apiClient.post<Bed>(
        API_ROUTES.DEPARTMENTS.BEDS.RELEASE(bedId),
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data, { bedId }) => {
      queryClient.invalidateQueries({
        queryKey: BED_QUERY_KEYS.detail(bedId),
      });
      queryClient.invalidateQueries({ queryKey: BED_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: WARD_QUERY_KEYS.allCensus() });
      queryClient.invalidateQueries({
        queryKey: WARD_QUERY_KEYS.census(data.wardId),
      });
    },
  });
}

/**
 * Transfer a patient between beds
 */
export function useTransferBed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TransferBedRequest) => {
      const response = await apiClient.post<{ success: boolean }>(
        API_ROUTES.DEPARTMENTS.BEDS.TRANSFER,
        data
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({
        queryKey: BED_QUERY_KEYS.detail(data.fromBedId),
      });
      queryClient.invalidateQueries({
        queryKey: BED_QUERY_KEYS.detail(data.toBedId),
      });
      queryClient.invalidateQueries({ queryKey: BED_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: WARD_QUERY_KEYS.allCensus() });
    },
  });
}

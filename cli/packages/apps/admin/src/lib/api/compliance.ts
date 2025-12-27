/**
 * Compliance API
 * API functions for regulation management, geographic regions, and compliance detection
 */

import {
  type ApplicableRegulation,
  type GeographicRegion,
  type Regulation,
  type RegulationSection,
  type RegulationStatus,
  type RegulationVersion,
} from "@lazarus-life/shared/types";
import { apiClient } from "./client";

// Geographic Regions API
export const geographicRegionsApi = {
  list: async (parentId?: string): Promise<GeographicRegion[]> => {
    const query = parentId ? `?parent_id=${parentId}` : "";
    const response = await apiClient.get<GeographicRegion[]>(
      `/compliance/geographic-regions${query}`,
    );
    return response.data || [];
  },

  get: async (id: string): Promise<GeographicRegion> => {
    const response = await apiClient.get<GeographicRegion>(
      `/compliance/geographic-regions/${id}`,
    );
    if (!response.data) throw new Error(response.error?.message || "Region not found");
    return response.data;
  },

  create: async (data: Omit<GeographicRegion, "id">): Promise<GeographicRegion> => {
    const response = await apiClient.post<GeographicRegion>(
      "/compliance/geographic-regions",
      data,
    );
    if (!response.data) throw new Error(response.error?.message || "Failed to create region");
    return response.data;
  },

  update: async (id: string, data: Partial<GeographicRegion>): Promise<GeographicRegion> => {
    const response = await apiClient.put<GeographicRegion>(
      `/compliance/geographic-regions/${id}`,
      data,
    );
    if (!response.data) throw new Error(response.error?.message || "Failed to update region");
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/compliance/geographic-regions/${id}`);
  },

  getHierarchy: async (regionId: string): Promise<GeographicRegion[]> => {
    const response = await apiClient.get<GeographicRegion[]>(
      `/compliance/geographic-regions/${regionId}/hierarchy`,
    );
    return response.data || [];
  },
};

// Regulations API
export const regulationsApi = {
  list: async (status?: RegulationStatus): Promise<Regulation[]> => {
    const query = status ? `?status=${status}` : "";
    const response = await apiClient.get<Regulation[]>(`/compliance/regulations${query}`);
    return response.data || [];
  },

  get: async (id: string): Promise<Regulation> => {
    const response = await apiClient.get<Regulation>(`/compliance/regulations/${id}`);
    if (!response.data) throw new Error(response.error?.message || "Regulation not found");
    return response.data;
  },

  create: async (data: Omit<Regulation, "id">): Promise<Regulation> => {
    const response = await apiClient.post<Regulation>("/compliance/regulations", data);
    if (!response.data) throw new Error(response.error?.message || "Failed to create regulation");
    return response.data;
  },

  update: async (id: string, data: Partial<Regulation>): Promise<Regulation> => {
    const response = await apiClient.put<Regulation>(`/compliance/regulations/${id}`, data);
    if (!response.data) throw new Error(response.error?.message || "Failed to update regulation");
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/compliance/regulations/${id}`);
  },

  getVersions: async (regulationId: string): Promise<RegulationVersion[]> => {
    const response = await apiClient.get<RegulationVersion[]>(
      `/compliance/regulations/${regulationId}/versions`,
    );
    return response.data || [];
  },

  getSections: async (versionId: string): Promise<RegulationSection[]> => {
    const response = await apiClient.get<RegulationSection[]>(
      `/compliance/regulation-versions/${versionId}/sections`,
    );
    return response.data || [];
  },
};

// Compliance Detection API
export const complianceDetectionApi = {
  detect: async (
    location: { region_id?: string; coordinates?: [number, number] },
    entity_type: string,
  ): Promise<ApplicableRegulation[]> => {
    const response = await apiClient.post<ApplicableRegulation[]>("/compliance/detect", {
      location,
      entity_type,
    });
    return response.data || [];
  },
};

// Re-export types for convenience
export type {
  ApplicableRegulation,
  GeographicLevel,
  GeographicRegion,
  Regulation,
  RegulationCategory,
  RegulationSection,
  RegulationStatus,
  RegulationVersion,
} from "@lazarus-life/shared/types";

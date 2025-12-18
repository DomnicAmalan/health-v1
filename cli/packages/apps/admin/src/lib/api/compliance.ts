/**
 * Compliance API
 * API functions for regulation management, geographic regions, and compliance detection
 */

import { apiClient } from "./client";

// Types
export interface GeographicRegion {
  id: string;
  parent_id?: string;
  name: string;
  code?: string;
  level: GeographicLevel;
  metadata: Record<string, unknown>;
  effective_from: string;
  effective_to?: string;
}

export type GeographicLevel =
  | "continent"
  | "country"
  | "state"
  | "province"
  | "city"
  | "district"
  | "town"
  | "village"
  | "street";

export interface Regulation {
  id: string;
  code: string;
  name: string;
  category: RegulationCategory;
  issuing_body: string;
  jurisdiction_id?: string;
  jurisdiction_level?: GeographicLevel;
  effective_from: string;
  effective_to?: string;
  status: RegulationStatus;
  metadata: Record<string, unknown>;
}

export type RegulationCategory =
  | "privacy"
  | "security"
  | "clinical"
  | "billing"
  | "quality"
  | "safety"
  | "data_protection"
  | "accessibility"
  | "other";

export type RegulationStatus = "draft" | "active" | "superseded" | "archived";

export interface RegulationVersion {
  id: string;
  regulation_id: string;
  version_number: string;
  content_hash: string;
  effective_from: string;
  effective_to?: string;
  change_summary?: string;
}

export interface RegulationSection {
  id: string;
  version_id: string;
  parent_section_id?: string;
  section_number: string;
  title?: string;
  content: string;
  order_index: number;
}

export interface ApplicableRegulation {
  regulation_id: string;
  regulation_code: string;
  regulation_name: string;
  priority: number;
  source_region_id: string;
  source_region_name: string;
  effective_from: string;
  effective_to?: string;
}

// Geographic Regions API
export const geographicRegionsApi = {
  list: async (parentId?: string): Promise<GeographicRegion[]> => {
    const query = parentId ? `?parent_id=${parentId}` : "";
    return apiClient.get<GeographicRegion[]>(`/compliance/geographic-regions${query}`);
  },

  get: async (id: string): Promise<GeographicRegion> => {
    return apiClient.get<GeographicRegion>(`/compliance/geographic-regions/${id}`);
  },

  create: async (
    data: Omit<GeographicRegion, "id" | "created_at" | "updated_at">
  ): Promise<GeographicRegion> => {
    return apiClient.post<GeographicRegion>("/compliance/geographic-regions", data);
  },

  update: async (id: string, data: Partial<GeographicRegion>): Promise<GeographicRegion> => {
    return apiClient.put<GeographicRegion>(`/compliance/geographic-regions/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/compliance/geographic-regions/${id}`);
  },

  getHierarchy: async (regionId: string): Promise<GeographicRegion[]> => {
    return apiClient.get<GeographicRegion[]>(
      `/compliance/geographic-regions/${regionId}/hierarchy`
    );
  },
};

// Regulations API
export const regulationsApi = {
  list: async (status?: RegulationStatus): Promise<Regulation[]> => {
    const query = status ? `?status=${status}` : "";
    return apiClient.get<Regulation[]>(`/compliance/regulations${query}`);
  },

  get: async (id: string): Promise<Regulation> => {
    return apiClient.get<Regulation>(`/compliance/regulations/${id}`);
  },

  create: async (
    data: Omit<Regulation, "id" | "created_at" | "updated_at">
  ): Promise<Regulation> => {
    return apiClient.post<Regulation>("/compliance/regulations", data);
  },

  update: async (id: string, data: Partial<Regulation>): Promise<Regulation> => {
    return apiClient.put<Regulation>(`/compliance/regulations/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/compliance/regulations/${id}`);
  },

  getVersions: async (regulationId: string): Promise<RegulationVersion[]> => {
    return apiClient.get<RegulationVersion[]>(`/compliance/regulations/${regulationId}/versions`);
  },

  getSections: async (versionId: string): Promise<RegulationSection[]> => {
    return apiClient.get<RegulationSection[]>(
      `/compliance/regulation-versions/${versionId}/sections`
    );
  },
};

// Compliance Detection API
export const complianceDetectionApi = {
  detect: async (
    location: { region_id?: string; coordinates?: [number, number] },
    entity_type: string
  ): Promise<ApplicableRegulation[]> => {
    return apiClient.post<ApplicableRegulation[]>("/compliance/detect", {
      location,
      entity_type,
    });
  },
};

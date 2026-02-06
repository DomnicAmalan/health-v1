/**
 * useBodySystems Hook
 * TanStack Query hooks for body systems taxonomy and context-aware lab recommendations
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@health-v1/shared/api/client';
import { API_ROUTES } from '@health-v1/shared/api/routes';
import type {
  BodySystem,
  BodySystemListResponse,
  LabRecommendationResponse,
} from '@health-v1/shared/types/ehr/anatomy';

// Query Keys
export const bodySystemKeys = {
  all: ['body-systems'] as const,
  lists: () => [...bodySystemKeys.all, 'list'] as const,
  list: () => [...bodySystemKeys.lists()] as const,
  details: () => [...bodySystemKeys.all, 'detail'] as const,
  detail: (id: string) => [...bodySystemKeys.details(), id] as const,
  labRecommendations: (id: string) =>
    [...bodySystemKeys.all, 'lab-recommendations', id] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * List all body systems
 * Cached for 10 minutes (relatively static data)
 */
export function useBodySystems() {
  return useQuery({
    queryKey: bodySystemKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<BodySystemListResponse>(
        API_ROUTES.EHR.BODY_SYSTEMS.LIST
      );
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (taxonomy is relatively static)
  });
}

/**
 * Get single body system by ID
 */
export function useBodySystem(systemId: string | undefined) {
  return useQuery({
    queryKey: bodySystemKeys.detail(systemId!),
    queryFn: async () => {
      const response = await apiClient.get<BodySystem>(
        API_ROUTES.EHR.BODY_SYSTEMS.GET(systemId!)
      );
      return response.data;
    },
    enabled: !!systemId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get context-aware lab recommendations for body system
 * Returns recommended lab tests/panels sorted by relevance score
 */
export function useBodySystemLabRecommendations(systemId: string | undefined) {
  return useQuery({
    queryKey: bodySystemKeys.labRecommendations(systemId!),
    queryFn: async () => {
      const response = await apiClient.get<LabRecommendationResponse>(
        API_ROUTES.EHR.BODY_SYSTEMS.LAB_RECOMMENDATIONS(systemId!)
      );
      return response.data;
    },
    enabled: !!systemId,
    staleTime: 10 * 60 * 1000, // 10 minutes (recommendations are static)
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Get body system by model region ID (for 3D model click detection)
 * Useful when user clicks on a 3D mesh and you need to find the corresponding body system
 */
export function useBodySystemByModelRegion(modelRegionId: string | undefined) {
  const { data: bodySystems } = useBodySystems();

  if (!bodySystems || !modelRegionId) {
    return undefined;
  }

  return bodySystems.systems.find(
    (system) => system.modelRegionId === modelRegionId
  );
}

/**
 * Get hierarchical body systems tree structure
 * Groups child systems under their parents for UI display
 */
export function useBodySystemsHierarchy() {
  const { data: bodySystems, ...queryState } = useBodySystems();

  if (!bodySystems) {
    return { data: undefined, ...queryState };
  }

  // Build tree structure
  const systemsMap = new Map<string, BodySystem & { children: BodySystem[] }>();

  // First pass: Create map with children arrays
  bodySystems.systems.forEach((system) => {
    systemsMap.set(system.id, { ...system, children: [] });
  });

  // Second pass: Build hierarchy
  const rootSystems: Array<BodySystem & { children: BodySystem[] }> = [];

  bodySystems.systems.forEach((system) => {
    const systemWithChildren = systemsMap.get(system.id)!;

    if (system.parentSystemId) {
      const parent = systemsMap.get(system.parentSystemId);
      if (parent) {
        parent.children.push(systemWithChildren);
      } else {
        // Parent not found, treat as root
        rootSystems.push(systemWithChildren);
      }
    } else {
      // No parent, this is a root system
      rootSystems.push(systemWithChildren);
    }
  });

  return {
    data: rootSystems,
    ...queryState,
  };
}

/**
 * useAnatomyFindings Hook
 * TanStack Query hooks for 3D anatomy-based clinical findings with PHI audit logging
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@health-v1/shared/api/client';
import { API_ROUTES } from '@health-v1/shared/api/routes';
import type {
  AnatomyFinding,
  CreateAnatomyFindingRequest,
  UpdateAnatomyFindingRequest,
  AnatomyFindingListResponse,
} from '@health-v1/shared/types/ehr/anatomy';
import { useAuditLog } from '@/hooks/useAuditLog';

// Query Keys
export const anatomyFindingKeys = {
  all: ['anatomy-findings'] as const,
  lists: () => [...anatomyFindingKeys.all, 'list'] as const,
  list: (encounterId: string) => [...anatomyFindingKeys.lists(), encounterId] as const,
  details: () => [...anatomyFindingKeys.all, 'detail'] as const,
  detail: (encounterId: string, findingId: string) =>
    [...anatomyFindingKeys.details(), encounterId, findingId] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * List anatomy findings for encounter
 */
export function useAnatomyFindings(encounterId: string | undefined) {
  const { logPHI } = useAuditLog();

  return useQuery({
    queryKey: anatomyFindingKeys.list(encounterId!),
    queryFn: async () => {
      const response = await apiClient.get<AnatomyFindingListResponse>(
        API_ROUTES.EHR.ANATOMY_FINDINGS.LIST(encounterId!)
      );

      // PHI Audit: Log access to anatomy findings (contains clinical observations)
      logPHI({
        action: 'view_anatomy_findings',
        resourceType: 'encounter',
        resourceId: encounterId!,
        purpose: 'Clinical documentation review',
        dataAccessed: `${response.data.findings.length} anatomy findings`,
      });

      return response.data;
    },
    enabled: !!encounterId,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter for active encounter documentation)
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create anatomy finding
 * PHI audit logging happens in onSuccess callback
 */
export function useCreateAnatomyFinding(encounterId: string) {
  const queryClient = useQueryClient();
  const { logPHI } = useAuditLog();

  return useMutation({
    mutationFn: async (data: CreateAnatomyFindingRequest) => {
      const response = await apiClient.post<AnatomyFinding>(
        API_ROUTES.EHR.ANATOMY_FINDINGS.CREATE(encounterId),
        data
      );
      return response.data;
    },
    onSuccess: (newFinding) => {
      // Invalidate findings list for this encounter
      queryClient.invalidateQueries({
        queryKey: anatomyFindingKeys.list(encounterId),
      });

      // PHI Audit: Log creation of clinical finding
      logPHI({
        action: 'create_anatomy_finding',
        resourceType: 'anatomy_finding',
        resourceId: newFinding.id,
        purpose: 'Clinical documentation',
        dataAccessed: `Created finding: ${newFinding.findingCategory} - ${newFinding.findingType}`,
      });
    },
  });
}

/**
 * Update anatomy finding
 */
export function useUpdateAnatomyFinding(encounterId: string, findingId: string) {
  const queryClient = useQueryClient();
  const { logPHI } = useAuditLog();

  return useMutation({
    mutationFn: async (data: UpdateAnatomyFindingRequest) => {
      const response = await apiClient.put<AnatomyFinding>(
        API_ROUTES.EHR.ANATOMY_FINDINGS.UPDATE(encounterId, findingId),
        data
      );
      return response.data;
    },
    onSuccess: (updatedFinding) => {
      // Update the finding in cache
      queryClient.setQueryData(
        anatomyFindingKeys.detail(encounterId, findingId),
        updatedFinding
      );

      // Invalidate findings list
      queryClient.invalidateQueries({
        queryKey: anatomyFindingKeys.list(encounterId),
      });

      // PHI Audit: Log update
      logPHI({
        action: 'update_anatomy_finding',
        resourceType: 'anatomy_finding',
        resourceId: findingId,
        purpose: 'Clinical documentation update',
        dataAccessed: 'Updated anatomy finding',
      });
    },
  });
}

/**
 * Delete anatomy finding (soft delete)
 */
export function useDeleteAnatomyFinding(encounterId: string, findingId: string) {
  const queryClient = useQueryClient();
  const { logPHI } = useAuditLog();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(
        API_ROUTES.EHR.ANATOMY_FINDINGS.DELETE(encounterId, findingId)
      );
    },
    onSuccess: () => {
      // Invalidate findings list
      queryClient.invalidateQueries({
        queryKey: anatomyFindingKeys.list(encounterId),
      });

      // Remove from cache
      queryClient.removeQueries({
        queryKey: anatomyFindingKeys.detail(encounterId, findingId),
      });

      // PHI Audit: Log deletion
      logPHI({
        action: 'delete_anatomy_finding',
        resourceType: 'anatomy_finding',
        resourceId: findingId,
        purpose: 'Clinical documentation correction',
        dataAccessed: 'Deleted anatomy finding',
      });
    },
  });
}

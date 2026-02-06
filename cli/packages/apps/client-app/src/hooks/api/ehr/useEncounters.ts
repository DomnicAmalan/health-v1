/**
 * useEncounters Hook
 * TanStack Query hooks for encounter (visit) management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@health-v1/shared/api/client';
import { API_ROUTES } from '@health-v1/shared/api/routes';
import type {
  Encounter,
  CreateEncounterRequest,
  UpdateEncounterRequest,
  ListEncountersFilters,
  EncounterListResponse,
} from '@health-v1/shared/types/ehr/encounters';

// Query Keys
export const encounterKeys = {
  all: ['encounters'] as const,
  lists: () => [...encounterKeys.all, 'list'] as const,
  list: (filters: ListEncountersFilters) => [...encounterKeys.lists(), filters] as const,
  details: () => [...encounterKeys.all, 'detail'] as const,
  detail: (id: string) => [...encounterKeys.details(), id] as const,
  byPatient: (patientId: string) => [...encounterKeys.all, 'patient', patientId] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch single encounter by ID
 */
export function useEncounter(encounterId: string | undefined) {
  return useQuery({
    queryKey: encounterKeys.detail(encounterId!),
    queryFn: async () => {
      const response = await apiClient.get<Encounter>(
        API_ROUTES.EHR.ENCOUNTERS.GET(encounterId!)
      );
      return response.data;
    },
    enabled: !!encounterId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * List encounters with filters
 */
export function useEncounters(filters: ListEncountersFilters = {}) {
  return useQuery({
    queryKey: encounterKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<EncounterListResponse>(
        API_ROUTES.EHR.ENCOUNTERS.LIST,
        { params: filters }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * List encounters for specific patient
 */
export function usePatientEncounters(patientId: string | undefined) {
  return useQuery({
    queryKey: encounterKeys.byPatient(patientId!),
    queryFn: async () => {
      const response = await apiClient.get<EncounterListResponse>(
        API_ROUTES.EHR.ENCOUNTERS.BY_PATIENT(patientId!)
      );
      return response.data;
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create new encounter
 */
export function useCreateEncounter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEncounterRequest) => {
      const response = await apiClient.post<Encounter>(
        API_ROUTES.EHR.ENCOUNTERS.CREATE,
        data
      );
      return response.data;
    },
    onSuccess: (newEncounter) => {
      // Invalidate all encounter lists
      queryClient.invalidateQueries({ queryKey: encounterKeys.lists() });

      // Invalidate patient-specific encounters
      queryClient.invalidateQueries({
        queryKey: encounterKeys.byPatient(newEncounter.patientId),
      });

      // Set the new encounter in cache
      queryClient.setQueryData(encounterKeys.detail(newEncounter.id), newEncounter);
    },
  });
}

/**
 * Update encounter
 */
export function useUpdateEncounter(encounterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateEncounterRequest) => {
      const response = await apiClient.put<Encounter>(
        API_ROUTES.EHR.ENCOUNTERS.UPDATE(encounterId),
        data
      );
      return response.data;
    },
    onSuccess: (updatedEncounter) => {
      // Update the encounter in cache
      queryClient.setQueryData(
        encounterKeys.detail(encounterId),
        updatedEncounter
      );

      // Invalidate encounter lists
      queryClient.invalidateQueries({ queryKey: encounterKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: encounterKeys.byPatient(updatedEncounter.patientId),
      });
    },
  });
}

/**
 * Complete encounter (transition to completed status)
 */
export function useCompleteEncounter(encounterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<Encounter>(
        API_ROUTES.EHR.ENCOUNTERS.COMPLETE(encounterId)
      );
      return response.data;
    },
    onSuccess: (completedEncounter) => {
      // Update the encounter in cache
      queryClient.setQueryData(
        encounterKeys.detail(encounterId),
        completedEncounter
      );

      // Invalidate encounter lists (status changed)
      queryClient.invalidateQueries({ queryKey: encounterKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: encounterKeys.byPatient(completedEncounter.patientId),
      });
    },
  });
}

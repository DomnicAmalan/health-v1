/**
 * Operational Dashboard Hooks
 * TanStack Query hooks for operational analytics and metrics
 */

import { useQuery } from "@tanstack/react-query";
import { API_ROUTES } from "@lazarus-life/shared";
import { useApiClient } from "@/lib/api/client";
import type {
  TimePeriod,
  BedOccupancy,
  BedOccupancyByWard,
  BedOccupancyTrend,
  ResourceUtilization,
  OTUtilization,
  EquipmentStatus,
  StaffOverview,
  StaffByRole,
  StaffSchedule,
  QueueStats,
  QueueTrend,
  InventoryOverview,
  InventoryAlert,
  EmergencyDepartmentStats,
  OperationalKPIs,
  OperationalDashboardSummary,
} from "@lazarus-life/shared";

// Query keys
export const operationalDashboardKeys = {
  all: ["operational-dashboard"] as const,
  summary: () => [...operationalDashboardKeys.all, "summary"] as const,
  bedOccupancy: () => [...operationalDashboardKeys.all, "beds", "occupancy"] as const,
  bedOccupancyByWard: () => [...operationalDashboardKeys.all, "beds", "occupancy", "by-ward"] as const,
  bedOccupancyTrend: (period: TimePeriod) => [...operationalDashboardKeys.all, "beds", "occupancy", "trend", period] as const,
  resources: () => [...operationalDashboardKeys.all, "resources"] as const,
  otUtilization: () => [...operationalDashboardKeys.all, "ot", "utilization"] as const,
  equipment: () => [...operationalDashboardKeys.all, "equipment"] as const,
  staff: () => [...operationalDashboardKeys.all, "staff"] as const,
  staffByRole: () => [...operationalDashboardKeys.all, "staff", "by-role"] as const,
  staffSchedule: (date: string) => [...operationalDashboardKeys.all, "staff", "schedule", date] as const,
  queues: () => [...operationalDashboardKeys.all, "queues"] as const,
  queueTrend: (period: TimePeriod) => [...operationalDashboardKeys.all, "queues", "trend", period] as const,
  inventory: () => [...operationalDashboardKeys.all, "inventory"] as const,
  inventoryAlerts: () => [...operationalDashboardKeys.all, "inventory", "alerts"] as const,
  emergency: () => [...operationalDashboardKeys.all, "emergency"] as const,
  kpis: () => [...operationalDashboardKeys.all, "kpis"] as const,
};

// Summary
export function useOperationalDashboardSummary() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.summary(),
    queryFn: async () => {
      const response = await apiClient.get<OperationalDashboardSummary>(API_ROUTES.ANALYTICS.OPERATIONAL.SUMMARY);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Bed Occupancy
export function useBedOccupancy() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.bedOccupancy(),
    queryFn: async () => {
      const response = await apiClient.get<BedOccupancy>(API_ROUTES.ANALYTICS.OPERATIONAL.BED_OCCUPANCY);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useBedOccupancyByWard() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.bedOccupancyByWard(),
    queryFn: async () => {
      const response = await apiClient.get<BedOccupancyByWard[]>(API_ROUTES.ANALYTICS.OPERATIONAL.BED_OCCUPANCY_BY_WARD);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useBedOccupancyTrend(period: TimePeriod = "week") {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.bedOccupancyTrend(period),
    queryFn: async () => {
      const response = await apiClient.get<BedOccupancyTrend[]>(API_ROUTES.ANALYTICS.OPERATIONAL.BED_OCCUPANCY_TREND, {
        params: { period },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Resource Utilization
export function useResourceUtilization() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.resources(),
    queryFn: async () => {
      const response = await apiClient.get<ResourceUtilization[]>(API_ROUTES.ANALYTICS.OPERATIONAL.RESOURCE_UTILIZATION);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useOTUtilization() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.otUtilization(),
    queryFn: async () => {
      const response = await apiClient.get<OTUtilization[]>(API_ROUTES.ANALYTICS.OPERATIONAL.OT_UTILIZATION);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useEquipmentStatus() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.equipment(),
    queryFn: async () => {
      const response = await apiClient.get<EquipmentStatus[]>(API_ROUTES.ANALYTICS.OPERATIONAL.EQUIPMENT_STATUS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Staff
export function useStaffOverview() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.staff(),
    queryFn: async () => {
      const response = await apiClient.get<StaffOverview>(API_ROUTES.ANALYTICS.OPERATIONAL.STAFF_OVERVIEW);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useStaffByRole() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.staffByRole(),
    queryFn: async () => {
      const response = await apiClient.get<StaffByRole[]>(API_ROUTES.ANALYTICS.OPERATIONAL.STAFF_BY_ROLE);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useStaffSchedule(date: string) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.staffSchedule(date),
    queryFn: async () => {
      const response = await apiClient.get<StaffSchedule[]>(API_ROUTES.ANALYTICS.OPERATIONAL.STAFF_SCHEDULE, {
        params: { date },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
    enabled: !!date,
  });
}

// Queues
export function useQueueStats() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.queues(),
    queryFn: async () => {
      const response = await apiClient.get<QueueStats[]>(API_ROUTES.ANALYTICS.OPERATIONAL.QUEUE_STATS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useQueueTrend(period: TimePeriod = "today") {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.queueTrend(period),
    queryFn: async () => {
      const response = await apiClient.get<QueueTrend[]>(API_ROUTES.ANALYTICS.OPERATIONAL.QUEUE_TREND, {
        params: { period },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Inventory
export function useInventoryOverview() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.inventory(),
    queryFn: async () => {
      const response = await apiClient.get<InventoryOverview>(API_ROUTES.ANALYTICS.OPERATIONAL.INVENTORY_OVERVIEW);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useInventoryAlerts() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.inventoryAlerts(),
    queryFn: async () => {
      const response = await apiClient.get<InventoryAlert[]>(API_ROUTES.ANALYTICS.OPERATIONAL.INVENTORY_ALERTS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

// Emergency Department
export function useEmergencyStats() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.emergency(),
    queryFn: async () => {
      const response = await apiClient.get<EmergencyDepartmentStats>(API_ROUTES.ANALYTICS.OPERATIONAL.EMERGENCY_STATS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
    refetchInterval: 30000, // Refresh every 30 seconds for ED
  });
}

// KPIs
export function useOperationalKPIs() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: operationalDashboardKeys.kpis(),
    queryFn: async () => {
      const response = await apiClient.get<OperationalKPIs>(API_ROUTES.ANALYTICS.OPERATIONAL.KPIS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

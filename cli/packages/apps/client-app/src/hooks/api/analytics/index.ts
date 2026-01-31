/**
 * Analytics Hooks Index
 * Re-export all analytics and dashboard hooks
 */

export * from "./useClinicalDashboard";
export * from "./useFinancialDashboard";
export * from "./useComplianceDashboard";

// Export operational dashboard hooks except useBedOccupancy which conflicts with departments
export {
  operationalDashboardKeys,
  useOperationalDashboardSummary,
  // useBedOccupancy - excluded to avoid conflict with departments/useBeds
  useBedOccupancyByWard,
  useBedOccupancyTrend,
  useResourceUtilization,
  useOTUtilization,
  useEquipmentStatus,
  useStaffOverview,
  useStaffByRole,
  useStaffSchedule,
  useQueueStats,
  useQueueTrend,
  useInventoryOverview,
  useInventoryAlerts,
  useEmergencyStats,
  useOperationalKPIs,
} from "./useOperationalDashboard";

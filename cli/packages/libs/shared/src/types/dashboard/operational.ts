/**
 * Operational Dashboard Types
 * Types for bed management, resources, and operational metrics
 */

// Bed Management
export interface BedOccupancy {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  blockedBeds: number;
  maintenanceBeds: number;
  occupancyRate: number;
  averageLengthOfStay: number;
  turnoverRate: number;
}

export interface BedOccupancyByWard {
  wardId: string;
  wardName: string;
  wardType: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  reservedBeds: number;
}

export interface BedOccupancyTrend {
  date: string;
  occupancyRate: number;
  admissions: number;
  discharges: number;
}

// Resource Utilization
export interface ResourceUtilization {
  resourceType: "ot" | "icu" | "radiology_room" | "lab_equipment" | "consultation_room";
  totalUnits: number;
  activeUnits: number;
  utilizationRate: number;
  peakHours: string[];
  averageUsageTime: number;
}

export interface OTUtilization {
  otId: string;
  otName: string;
  totalSlots: number;
  usedSlots: number;
  utilizationRate: number;
  surgeriesCompleted: number;
  averageSurgeryTime: number;
  turnoverTime: number;
  cancellations: number;
}

export interface EquipmentStatus {
  equipmentId: string;
  equipmentName: string;
  type: string;
  status: "operational" | "maintenance" | "out_of_service" | "reserved";
  utilizationRate: number;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
}

// Staff and Workforce
export interface StaffOverview {
  totalStaff: number;
  onDuty: number;
  onLeave: number;
  byRole: StaffByRole[];
  staffPatientRatio: number;
}

export interface StaffByRole {
  role: string;
  total: number;
  onDuty: number;
  onLeave: number;
}

export interface StaffSchedule {
  date: string;
  shift: "morning" | "afternoon" | "night";
  staffCount: number;
  requiredCount: number;
  coverage: number;
}

// Queue Management
export interface QueueStats {
  departmentId: string;
  departmentName: string;
  currentWaiting: number;
  averageWaitTime: number;
  maxWaitTime: number;
  servedToday: number;
  abandonedToday: number;
  serviceRate: number;
}

export interface QueueTrend {
  time: string;
  waiting: number;
  served: number;
  averageWaitTime: number;
}

// Inventory Overview
export interface InventoryOverview {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiringItems: number;
  totalValue: number;
  categoryBreakdown: InventoryByCategory[];
}

export interface InventoryByCategory {
  category: string;
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryAlert {
  id: string;
  itemId: string;
  itemName: string;
  type: "low_stock" | "out_of_stock" | "expiring" | "expired";
  currentStock: number;
  reorderLevel: number;
  expiryDate?: string;
  severity: "low" | "medium" | "high" | "critical";
}

// Emergency Department
export interface EmergencyDepartmentStats {
  currentPatients: number;
  waitingTriage: number;
  inTreatment: number;
  awaitingAdmission: number;
  discharged: number;
  averageWaitTime: number;
  averageTreatmentTime: number;
  doorToDoctor: number; // minutes
  leftWithoutBeingSeen: number;
  byAcuity: EmergencyByAcuity[];
}

export interface EmergencyByAcuity {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  count: number;
  averageWaitTime: number;
  percentage: number;
}

// Operational KPIs
export interface OperationalKPIs {
  bedTurnoverRate: number;
  averageLengthOfStay: number;
  occupancyRate: number;
  otUtilization: number;
  staffEfficiency: number;
  appointmentSlotUtilization: number;
  emergencyDoorToDoctorTime: number;
  averageWaitTime: number;
}

// Dashboard Summary
export interface OperationalDashboardSummary {
  bedOccupancy: BedOccupancy;
  bedOccupancyByWard: BedOccupancyByWard[];
  resourceUtilization: ResourceUtilization[];
  staffOverview: StaffOverview;
  queueStats: QueueStats[];
  inventoryOverview: InventoryOverview;
  inventoryAlerts: InventoryAlert[];
  emergencyStats: EmergencyDepartmentStats;
  kpis: OperationalKPIs;
  lastUpdated: string;
}

/**
 * Ward Types
 * Ward management for hospital departments
 */

/** Ward specialty types */
export type WardSpecialty =
  | "general_medicine"
  | "general_surgery"
  | "pediatrics"
  | "obstetrics"
  | "gynecology"
  | "orthopedics"
  | "cardiology"
  | "neurology"
  | "oncology"
  | "nephrology"
  | "psychiatry"
  | "icu"
  | "nicu"
  | "picu"
  | "ccu"
  | "emergency"
  | "isolation"
  | "burn"
  | "other";

/** Ward status */
export type WardStatus = "active" | "inactive" | "maintenance" | "closed";

/** Ward definition */
export interface Ward {
  id: string;
  wardCode: string;
  wardName: string;
  specialty: WardSpecialty;
  departmentId?: string;
  departmentName?: string;

  // Capacity
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  reservedBeds: number;
  maintenanceBeds: number;

  // Gender allocation
  maleBeds?: number;
  femaleBeds?: number;
  mixedBeds?: number;
  isolationBeds?: number;

  // Staff
  wardManagerId?: string;
  wardManagerName?: string;
  nursingStationPhone?: string;

  // Configuration
  visitingHours?: VisitingHours;
  isolationPolicies?: string[];
  notes?: string;
  description?: string; // Ward description

  // Location
  building?: string;
  floor?: string;
  floorNumber?: string; // Floor number (alias/alternative to floor)

  status: WardStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Visiting hours configuration */
export interface VisitingHours {
  morning?: { start: string; end: string };
  afternoon?: { start: string; end: string };
  evening?: { start: string; end: string };
  restrictedDays?: string[]; // e.g., ["Sunday"]
  maxVisitorsPerPatient?: number;
  notes?: string;
}

/** Ward census summary */
export interface WardCensus {
  wardId: string;
  wardCode: string;
  wardName: string;
  specialty: WardSpecialty;
  totalBeds: number;
  occupied: number;
  available: number;
  reserved: number;
  maintenance: number;
  occupancyRate: number; // percentage
  averageLengthOfStay?: number; // days
  admissionsToday: number;
  dischargesToday: number;
  transfersIn: number;
  transfersOut: number;
  censusDate: string;
}

/** Ward list response */
export interface WardListResponse {
  data: Ward[];
  total: number;
  page: number;
  pageSize: number;
}

/** Ward census response */
export interface WardCensusResponse {
  wards: WardCensus[];
  hospitalTotal: {
    totalBeds: number;
    occupied: number;
    available: number;
    overallOccupancy: number;
  };
  asOf: string;
}

/** Create ward request */
export interface CreateWardRequest {
  wardCode: string;
  wardName: string;
  specialty: WardSpecialty;
  departmentId?: string;
  totalBeds: number;
  maleBeds?: number;
  femaleBeds?: number;
  mixedBeds?: number;
  isolationBeds?: number;
  wardManagerId?: string;
  nursingStationPhone?: string;
  visitingHours?: VisitingHours;
  building?: string;
  floor?: string;
  notes?: string;
}

/** Update ward request */
export interface UpdateWardRequest {
  wardName?: string;
  specialty?: WardSpecialty;
  departmentId?: string;
  totalBeds?: number;
  maleBeds?: number;
  femaleBeds?: number;
  mixedBeds?: number;
  isolationBeds?: number;
  wardManagerId?: string;
  nursingStationPhone?: string;
  visitingHours?: VisitingHours;
  building?: string;
  floor?: string;
  notes?: string;
  status?: WardStatus;
}

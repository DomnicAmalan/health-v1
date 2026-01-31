/**
 * Bed Types
 * Bed management for hospital wards
 */

/** Bed type categories */
export type BedType =
  | "general"
  | "semi_private"
  | "private"
  | "deluxe"
  | "suite"
  | "icu"
  | "hdu" // High Dependency Unit
  | "nicu"
  | "picu"
  | "ccu"
  | "isolation"
  | "burn"
  | "emergency"
  | "observation"
  | "labor_delivery"
  | "recovery"
  | "dialysis"
  | "other";

/** Bed status */
export type BedStatus =
  | "vacant"
  | "occupied"
  | "reserved"
  | "maintenance"
  | "housekeeping"
  | "cleaning"
  | "blocked";

/** Bed cleanliness status */
export type BedCleanlinessStatus =
  | "clean"
  | "dirty"
  | "cleaning_in_progress"
  | "needs_inspection"
  | "disinfected";

/** Bed gender assignment */
export type BedGender = "male" | "female" | "any";

/** Bed definition */
export interface Bed {
  id: string;
  bedCode: string;
  bedNumber: string;
  wardId: string;
  wardCode?: string;
  wardName?: string;
  roomNumber?: string;
  bedType: BedType;
  bedGender: BedGender;

  // Status
  status: BedStatus;
  cleanlinessStatus: BedCleanlinessStatus;

  // Current occupant
  currentPatientId?: string;
  currentPatientName?: string;
  currentPatientMrn?: string;
  currentAdmissionId?: string;
  occupiedSince?: string;
  expectedDischarge?: string;

  // Reservation
  reservedForPatientId?: string;
  reservedForPatientName?: string;
  reservedUntil?: string;
  reservationReason?: string;

  // Equipment and features
  hasOxygen: boolean;
  hasSuction: boolean;
  hasMonitor: boolean;
  hasVentilator: boolean;
  isWindowSide: boolean;
  isNearNursingStation: boolean;
  additionalEquipment?: string[];
  notes?: string;

  // Pricing (per day, in base currency)
  dailyRate?: number;
  currencyCode?: string;

  // Location
  building?: string;
  floor?: string;
  wing?: string;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Bed summary for quick views */
export interface BedSummary {
  id: string;
  bedCode: string;
  bedNumber: string;
  wardId: string;
  wardName: string;
  roomNumber?: string;
  bedType: BedType;
  status: BedStatus;
  cleanlinessStatus: BedCleanlinessStatus;
  currentPatientName?: string;
  currentPatientMrn?: string;
  occupiedSince?: string;
  expectedDischarge?: string;
}

/** Bed allocation request */
export interface AllocateBedRequest {
  patientId: string;
  admissionId: string;
  expectedDischarge?: string;
  notes?: string;
}

/** Bed release request */
export interface ReleaseBedRequest {
  reason: string;
  nextStatus?: BedStatus;
  needsCleaning?: boolean;
}

/** Bed transfer request */
export interface TransferBedRequest {
  fromBedId: string;
  toBedId: string;
  patientId: string;
  admissionId: string;
  reason: string;
  transferTime?: string;
}

/** Bed history entry */
export interface BedHistoryEntry {
  id: string;
  bedId: string;
  eventType: "allocated" | "released" | "transferred_in" | "transferred_out" | "status_change" | "maintenance";
  patientId?: string;
  patientName?: string;
  admissionId?: string;
  previousStatus?: BedStatus;
  newStatus: BedStatus;
  reason?: string;
  performedBy?: string;
  performedAt: string;
}

/** Bed list response */
export interface BedListResponse {
  data: Bed[];
  total: number;
  page: number;
  pageSize: number;
}

/** Bed availability response */
export interface BedAvailabilityResponse {
  availableBeds: BedSummary[];
  byWard: Record<string, number>;
  byType: Record<BedType, number>;
  total: number;
}

/** Create bed request */
export interface CreateBedRequest {
  bedCode: string;
  bedNumber: string;
  wardId: string;
  roomNumber?: string;
  bedType: BedType;
  bedGender?: BedGender;
  hasOxygen?: boolean;
  hasSuction?: boolean;
  hasMonitor?: boolean;
  hasVentilator?: boolean;
  isWindowSide?: boolean;
  isNearNursingStation?: boolean;
  additionalEquipment?: string[];
  dailyRate?: number;
  currencyCode?: string;
  building?: string;
  floor?: string;
  wing?: string;
  notes?: string;
}

/** Update bed request */
export interface UpdateBedRequest {
  bedNumber?: string;
  roomNumber?: string;
  bedType?: BedType;
  bedGender?: BedGender;
  status?: BedStatus;
  cleanlinessStatus?: BedCleanlinessStatus;
  hasOxygen?: boolean;
  hasSuction?: boolean;
  hasMonitor?: boolean;
  hasVentilator?: boolean;
  isWindowSide?: boolean;
  isNearNursingStation?: boolean;
  additionalEquipment?: string[];
  dailyRate?: number;
  currencyCode?: string;
  notes?: string;
}

/** Bed occupancy summary for dashboard */
export interface BedOccupancySummary {
  totalBeds: number;
  total: number; // Alias for totalBeds
  occupied: number;
  vacant: number;
  available: number; // Alias for vacant
  reserved: number;
  maintenance: number;
  housekeeping: number;
  occupancyRate: number;
  byWard: {
    wardId: string;
    wardName: string;
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  }[];
  byType: {
    bedType: BedType;
    total: number;
    occupied: number;
    available: number;
  }[];
  asOf: string;
}

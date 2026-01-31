/**
 * Hospital Configuration types
 * Links hospital to location and configuration for jurisdiction-aware behavior
 */

/**
 * Hospital type
 */
export type HospitalType =
  | "government"
  | "private"
  | "teaching"
  | "specialty"
  | "community"
  | "military"
  | "research";

/**
 * Accreditation status
 */
export type AccreditationStatus =
  | "accredited"
  | "provisional"
  | "pending"
  | "expired"
  | "none";

/**
 * Hospital feature flags
 */
export interface HospitalFeatures {
  /** Pharmacy module enabled */
  pharmacy?: boolean;
  /** Telemedicine enabled */
  telemedicine?: boolean;
  /** Laboratory Information System enabled */
  lis?: boolean;
  /** Radiology Information System enabled */
  ris?: boolean;
  /** Bed management enabled */
  bedManagement?: boolean;
  /** Operation theatre management enabled */
  otManagement?: boolean;
  /** In-patient department enabled */
  ipd?: boolean;
  /** Out-patient department enabled */
  opd?: boolean;
  /** Emergency department enabled */
  emergency?: boolean;
  /** Blood bank enabled */
  bloodBank?: boolean;
  /** Insurance integration enabled */
  insurance?: boolean;
  /** Multi-currency billing enabled */
  multiCurrency?: boolean;
  /** Patient portal enabled */
  patientPortal?: boolean;
  /** Mobile app enabled */
  mobileApp?: boolean;
  /** Additional custom features */
  [key: string]: boolean | undefined;
}

/**
 * Hospital settings
 */
export interface HospitalSettings {
  /** Default department for new registrations */
  defaultDepartment?: string;
  /** Default consultation fee */
  defaultConsultationFee?: number;
  /** Appointment slot duration in minutes */
  appointmentSlotMinutes?: number;
  /** Maximum advance booking days */
  maxAdvanceBookingDays?: number;
  /** Require pre-payment for appointments */
  requirePrePayment?: boolean;
  /** Allow walk-in registrations */
  allowWalkIn?: boolean;
  /** Bed allocation strategy */
  bedAllocationStrategy?: "manual" | "auto" | "semi-auto";
  /** Default prescription validity days */
  prescriptionValidityDays?: number;
  /** Enable drug interaction alerts */
  enableDrugInteractionAlerts?: boolean;
  /** Lab result auto-release */
  labAutoRelease?: boolean;
  /** Lab result release delay hours */
  labReleaseDelayHours?: number;
  /** Additional custom settings */
  [key: string]: unknown;
}

/**
 * Geographic coordinates
 */
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Hospital configuration entity
 */
export interface HospitalConfig {
  id: string;

  /** Organization ID */
  organizationId: string;

  /** Hospital code (unique identifier) */
  hospitalCode: string;

  /** Hospital name */
  hospitalName: string;

  /** Type of hospital */
  hospitalType: HospitalType;

  // Location
  /** Geographic region ID */
  regionId: string;

  /** Address line 1 */
  addressLine1?: string;

  /** Address line 2 */
  addressLine2?: string;

  /** City */
  city?: string;

  /** State/Province */
  state?: string;

  /** Postal code */
  postalCode?: string;

  /** Country code (ISO 3166-1 alpha-3) */
  countryCode: string;

  /** Exact coordinates */
  coordinates?: GeoCoordinates;

  // Regulatory
  /** License number */
  licenseNumber?: string;

  /** License expiry date */
  licenseExpiry?: string;

  /** Accreditation body (e.g., "NABH", "JCI") */
  accreditationBody?: string;

  /** Accreditation status */
  accreditationStatus?: AccreditationStatus;

  /** Accreditation expiry date */
  accreditationExpiry?: string;

  // Configuration
  /** Timezone (e.g., "Asia/Kolkata") */
  timezone: string;

  /** Locale (e.g., "en", "hi") */
  locale: string;

  /** Default currency code (ISO 4217) */
  currencyCode: string;

  /** Fiscal year start month (1-12) */
  fiscalYearStart: number;

  /** Feature flags */
  features: HospitalFeatures;

  /** Hospital settings */
  settings: HospitalSettings;

  /** Whether hospital is active */
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

/**
 * Hospital config with joined data
 */
export interface HospitalConfigWithRegion extends HospitalConfig {
  /** Region details */
  region?: {
    id: string;
    name: string;
    parentId?: string;
    countryCode: string;
    level: number;
  };

  /** Organization details */
  organization?: {
    id: string;
    name: string;
    code: string;
  };
}

/**
 * Create hospital config request
 */
export interface CreateHospitalConfigRequest {
  organizationId: string;
  hospitalCode: string;
  hospitalName: string;
  hospitalType: HospitalType;
  regionId: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode: string;
  coordinates?: GeoCoordinates;
  licenseNumber?: string;
  licenseExpiry?: string;
  accreditationBody?: string;
  accreditationStatus?: AccreditationStatus;
  accreditationExpiry?: string;
  timezone?: string;
  locale?: string;
  currencyCode?: string;
  fiscalYearStart?: number;
  features?: HospitalFeatures;
  settings?: HospitalSettings;
}

/**
 * Update hospital config request
 */
export interface UpdateHospitalConfigRequest {
  hospitalName?: string;
  hospitalType?: HospitalType;
  regionId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
  coordinates?: GeoCoordinates;
  licenseNumber?: string;
  licenseExpiry?: string;
  accreditationBody?: string;
  accreditationStatus?: AccreditationStatus;
  accreditationExpiry?: string;
  timezone?: string;
  locale?: string;
  currencyCode?: string;
  fiscalYearStart?: number;
  features?: HospitalFeatures;
  settings?: HospitalSettings;
  isActive?: boolean;
}

/**
 * Hospital config search query
 */
export interface HospitalConfigSearchQuery {
  regionId?: string;
  countryCode?: string;
  hospitalType?: HospitalType;
  accreditationStatus?: AccreditationStatus;
  activeOnly?: boolean;
  /** Search by coordinates (nearby) */
  nearLat?: number;
  nearLng?: number;
  nearRadiusKm?: number;
  page?: number;
  pageSize?: number;
}

/**
 * Hospital config list response
 */
export interface HospitalConfigListResponse {
  data: HospitalConfigWithRegion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get applicable rules for a hospital
 */
export interface GetApplicableRulesRequest {
  hospitalId: string;
  moduleName?: string;
  entityName?: string;
}

/**
 * Hospital jurisdiction context
 * Used to determine which rules apply to a hospital
 */
export interface HospitalJurisdictionContext {
  hospitalId: string;
  organizationId: string;
  regionId: string;
  countryCode: string;
  timezone: string;
  locale: string;
  currencyCode: string;
  /** Applicable regulation IDs */
  regulationIds: string[];
  /** Enabled features */
  features: HospitalFeatures;
}

/**
 * Pharmacy/Drug Catalog types
 * Drug catalogs, interactions, and contraindications
 * International, jurisdiction-agnostic
 */

/**
 * Drug schedule type - varies by jurisdiction
 * Examples:
 * - India (CDSCO): Schedule H, H1, X, G
 * - USA (DEA): Schedule I-V, Rx Only
 * - UK (MHRA): POM, P, GSL
 * - Australia (TGA): S2-S8
 */
export type DrugScheduleType =
  // India
  | "schedule_h"
  | "schedule_h1"
  | "schedule_x"
  | "schedule_g"
  // USA
  | "schedule_i"
  | "schedule_ii"
  | "schedule_iii"
  | "schedule_iv"
  | "schedule_v"
  | "rx_only"
  // General
  | "otc"
  | "unscheduled"
  | "investigational";

/** Drug schedule display info */
export interface DrugScheduleInfo {
  id: string;
  code: string;
  name: string;
  scheduleType: DrugScheduleType;
  catalogId: string;
  regionId: string;
  description?: string;
  prescriberRequirements?: string;
  dispensingRequirements?: string;
  recordKeepingDays?: number;
  refillAllowed: boolean;
  maxRefills?: number;
  maxQuantityDays?: number;
  requiresPrescription: boolean;
  requiresSpecialRecords: boolean;
  isControlled: boolean;
  isActive: boolean;
}

/** Drug catalog (country/region specific) */
export interface DrugCatalog {
  id: string;
  catalogCode: string;
  catalogName: string;
  catalogVersion?: string;
  regionId: string;
  countryCode: string;
  regulatoryBody?: string;
  regulatoryUrl?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Drug catalog with schedules */
export interface DrugCatalogWithSchedules extends DrugCatalog {
  schedules: DrugScheduleInfo[];
}

/** Drug form type */
export type DrugFormType =
  | "tablet"
  | "capsule"
  | "syrup"
  | "suspension"
  | "injection"
  | "iv_fluid"
  | "cream"
  | "ointment"
  | "gel"
  | "drops"
  | "inhaler"
  | "patch"
  | "suppository"
  | "powder"
  | "solution"
  | "spray"
  | "lozenge"
  | "granules"
  | "other";

/** Drug route of administration */
export type DrugRoute =
  | "oral"
  | "sublingual"
  | "buccal"
  | "intravenous"
  | "intramuscular"
  | "subcutaneous"
  | "intradermal"
  | "topical"
  | "transdermal"
  | "inhalation"
  | "nasal"
  | "ophthalmic"
  | "otic"
  | "rectal"
  | "vaginal"
  | "intrathecal"
  | "epidural"
  | "other";

/** Drug in catalog (drug_master) */
export interface Drug {
  id: string;
  drugCode: string;
  genericName: string;
  brandNames: string[];

  // Classification
  catalogId: string;
  scheduleId?: string;
  therapeuticClass?: string;
  pharmacologicalClass?: string;

  // Coding systems (international)
  atcCode?: string; // WHO ATC
  rxnormCode?: string; // US RxNorm
  ndcCode?: string; // US NDC
  snomedCode?: string; // SNOMED CT

  // Drug properties
  form: DrugFormType;
  route: DrugRoute;
  strength?: string;
  strengthUnit?: string;
  strengthValue?: number;

  // Dosing information
  usualDose?: string;
  maxDailyDose?: string;
  pediatricDose?: string;
  geriatricDose?: string;

  // Special populations
  pregnancyCategory?: string;
  lactationSafe?: boolean;
  renalAdjustmentRequired: boolean;
  hepaticAdjustmentRequired: boolean;

  // Storage
  storageConditions?: string;
  shelfLifeMonths?: number;
  requiresRefrigeration: boolean;
  lightSensitive: boolean;

  // Pricing (multi-currency)
  unitPrice?: number;
  currencyCode?: string;
  priceEffectiveDate?: string;

  // Status
  isFormulary: boolean;
  isActive: boolean;

  // Joined data
  schedule?: DrugScheduleInfo;

  createdAt: string;
  updatedAt: string;
}

/** Drug search query parameters */
export interface DrugSearchQuery {
  q: string;
  catalogId?: string;
  isFormulary?: boolean;
  therapeuticClass?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated drug response */
export interface DrugSearchResponse {
  data: Drug[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Drug interaction severity */
export type InteractionSeverity =
  | "minor"
  | "moderate"
  | "major"
  | "contraindicated";

/** Drug interaction */
export interface DrugInteraction {
  id: string;
  drugAId: string;
  drugAName: string;
  drugBId: string;
  drugBName: string;
  severity: InteractionSeverity;
  description: string;
  clinicalEffects?: string;
  management?: string;
  documentation?: string;
}

/** Drug contraindication */
export interface DrugContraindication {
  id: string;
  drugId: string;
  drugName: string;
  condition: string;
  conditionCode?: string;
  severity: InteractionSeverity;
  description: string;
  isAbsolute: boolean;
}

/** Allergy alert from interaction check */
export interface AllergyAlert {
  patientIen: number;
  allergen: string;
  allergyType: "drug" | "food" | "environmental";
  severity: "mild" | "moderate" | "severe" | "life_threatening";
  drugName: string;
  matchType: "exact" | "class" | "ingredient";
}

/** Interaction check request */
export interface InteractionCheckRequest {
  drugIds: string[];
  patientIen?: number;
}

/** Interaction check response */
export interface InteractionCheckResponse {
  drugInteractions: DrugInteraction[];
  contraindications: DrugContraindication[];
  allergyAlerts: AllergyAlert[];
  hasCritical: boolean;
  summary: string;
}

/** Drug allergy check response (from YottaDB) */
export interface DrugAllergyCheckResponse {
  hasAllergyConflict: boolean;
  allergies: {
    ien: number;
    allergen: string;
    patientIen: number;
    allergyType: string;
    severity: string;
    reactions?: string;
    status: string;
  }[];
  matchedAllergens: string[];
}

/** Catalog list response */
export interface DrugCatalogListResponse {
  data: DrugCatalog[];
  total: number;
}

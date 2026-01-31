/**
 * Service Catalog Types
 * Hospital services, procedures, and pricing
 * International, jurisdiction-agnostic
 */

/** Service category for grouping services */
export interface ServiceCategory {
  id: string;
  code: string;
  name: string;
  localizedName?: string;
  description?: string;
  parentId?: string;
  displayOrder: number;
  isActive: boolean;
}

/** Tax code (jurisdiction-agnostic) */
export interface TaxCode {
  id: string;
  code: string;
  /** Code type varies by jurisdiction (HSN/SAC for India, commodity codes elsewhere) */
  codeType: string;
  jurisdictionId?: string;
  description: string;
  defaultRate: number;
  effectiveFrom: string;
  isActive: boolean;
}

/** Service price in a specific currency */
export interface ServicePrice {
  id: string;
  serviceId: string;
  currencyCode: string;
  price: number;
  minPrice?: number;
  maxPrice?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

/** Service type enumeration */
export type ServiceType =
  | "consultation"
  | "procedure"
  | "diagnostic"
  | "laboratory"
  | "radiology"
  | "pharmacy"
  | "nursing"
  | "therapy"
  | "surgery"
  | "accommodation"
  | "consumable"
  | "package"
  | "other";

/** Service/procedure definition */
export interface Service {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  localizedName?: string;
  description?: string;
  serviceType: ServiceType;
  departmentCode?: string;

  // Pricing (multi-currency)
  basePrice: number;
  baseCurrencyCode: string;
  prices?: ServicePrice[];
  unit: string;

  // Tax configuration
  taxCodeId?: string;
  taxCode?: string;
  isTaxable: boolean;
  taxInclusive: boolean;

  // Service settings
  durationMinutes?: number;
  requiresAppointment: boolean;
  requiresAuthorization: boolean;
  allowDiscount: boolean;
  maxDiscountPercent?: number;
  isActive: boolean;
}

/** Service price tier (for different patient types) */
export interface ServicePriceTier {
  id: string;
  serviceId: string;
  tierName: string;
  currencyCode: string;
  price: number;
  discountPercent?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

/** Service package (bundled services) */
export interface ServicePackage {
  id: string;
  code: string;
  name: string;
  localizedName?: string;
  description?: string;
  currencyCode: string;
  packagePrice: number;
  discountPercent?: number;
  isTaxable: boolean;
  isActive: boolean;
  items: PackageItem[];
}

/** Item in a service package */
export interface PackageItem {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  quantity: number;
  individualPrice?: number;
  isOptional: boolean;
}

/** Service search parameters */
export interface ServiceSearchParams {
  q?: string;
  categoryId?: string;
  serviceType?: ServiceType;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/** Service list response */
export interface ServiceListResponse {
  data: Service[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Request to create a service category */
export interface CreateServiceCategoryRequest {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  displayOrder?: number;
}

/** Request to create a service */
export interface CreateServiceRequest {
  categoryId: string;
  code: string;
  name: string;
  description?: string;
  serviceType: ServiceType;
  departmentCode?: string;
  basePrice: number;
  baseCurrencyCode?: string;
  unit?: string;
  taxCodeId?: string;
  isTaxable?: boolean;
  taxInclusive?: boolean;
  durationMinutes?: number;
  requiresAppointment?: boolean;
  requiresAuthorization?: boolean;
  allowDiscount?: boolean;
  maxDiscountPercent?: number;
}

/** Request to add a price in a specific currency */
export interface AddServicePriceRequest {
  currencyCode: string;
  price: number;
  minPrice?: number;
  maxPrice?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

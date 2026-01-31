/**
 * Tax Types
 * Dynamic tax system supporting any jurisdiction
 * Replaces hardcoded country-specific tax columns
 */

/** Tax system type (varies by country) */
export type TaxSystemType =
  | "gst" // Goods and Services Tax (India, Australia, Singapore)
  | "vat" // Value Added Tax (EU, UK, UAE, Saudi)
  | "sales_tax" // Sales Tax (USA - state/county/city)
  | "consumption" // Consumption Tax (Japan)
  | "hst" // Harmonized Sales Tax (Canada)
  | "none"; // No tax / Healthcare exempt

/** Tax jurisdiction (country/region configuration) */
export interface TaxJurisdiction {
  id: string;

  // Location identification
  countryCode: string; // ISO 3166-1 alpha-2 (US, IN, GB)
  regionCode?: string; // State/Province code
  cityCode?: string; // City code (for US city taxes)

  // Tax system info
  taxSystem: TaxSystemType;
  jurisdictionName: string;
  taxAuthority?: string;

  // Currency for this jurisdiction
  defaultCurrency: string;

  // Healthcare specific
  healthcareExempt: boolean;
  healthcareExemptCategories?: string[];

  // Tax identification fields required in this jurisdiction
  taxIdLabel?: string; // "GST Number", "VAT Number", "EIN"
  taxIdFormat?: string; // Regex for validation
  taxIdRequired: boolean;

  // Invoice requirements
  invoicePrefix?: string;
  invoiceNumberFormat?: string;
  requiresTaxBreakdown: boolean;

  // Status
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

/** What the tax applies to */
export type TaxAppliesTo =
  | "all"
  | "goods"
  | "services"
  | "healthcare"
  | "pharmacy"
  | "equipment";

/** Tax component (dynamic tax rate) */
export interface TaxComponent {
  id: string;
  jurisdictionId: string;

  // Component identification
  componentCode: string; // "CGST", "SGST", "VAT", "STATE_TAX"
  componentName: string; // "Central GST", "State GST", "Value Added Tax"
  componentNameLocal?: string; // Localized name

  description?: string;

  // Tax rate
  ratePercent: number;

  // What this tax applies to
  appliesTo: TaxAppliesTo;

  // Calculation order (for compound taxes)
  calculationOrder: number;
  isCompound: boolean; // Calculate on base + previous taxes?

  // Reporting
  reportLineCode?: string;
  reportLineName?: string;

  // Status
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

/** Tax line on an invoice (calculated tax) */
export interface InvoiceTaxLine {
  id: string;
  invoiceId: string;
  invoiceItemId?: string;
  taxComponentId: string;

  // Amounts
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;

  // Component info (denormalized for invoice record)
  componentCode: string;
  componentName: string;

  // Exemption
  isExempt: boolean;
  exemptionReason?: string;
}

/** Organization tax settings */
export interface OrganizationTaxSettings {
  id: string;
  organizationId: string;

  // Primary jurisdiction
  primaryJurisdictionId: string;

  // Tax identification
  taxRegistrationNumber?: string;
  taxRegistrationName?: string;
  taxRegistrationAddress?: string;

  // Inter-jurisdiction settings
  enableInterJurisdiction: boolean;

  // Default tax behavior
  defaultTaxable: boolean;
  includeTaxInPrice: boolean;

  // Rounding
  taxRoundingMode: "half_up" | "half_down" | "floor" | "ceiling";
  roundAt: "line" | "total";
}

/** Tax calculation request */
export interface CalculateTaxRequest {
  jurisdictionId: string;
  amount: number;
  appliesTo?: TaxAppliesTo;
}

/** Tax calculation result */
export interface CalculateTaxResult {
  taxableAmount: number;
  taxLines: TaxLineResult[];
  totalTax: number;
  grandTotal: number;
}

/** Individual tax line result */
export interface TaxLineResult {
  componentCode: string;
  componentName: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
}

/** Tax jurisdiction search parameters */
export interface TaxJurisdictionSearchParams {
  countryCode?: string;
  regionCode?: string;
  taxSystem?: TaxSystemType;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/** Tax jurisdiction list response */
export interface TaxJurisdictionListResponse {
  data: TaxJurisdiction[];
  total: number;
  page: number;
  pageSize: number;
}

/** Tax component search parameters */
export interface TaxComponentSearchParams {
  jurisdictionId?: string;
  componentCode?: string;
  appliesTo?: TaxAppliesTo;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/** Tax component list response */
export interface TaxComponentListResponse {
  data: TaxComponent[];
  total: number;
  page: number;
  pageSize: number;
}

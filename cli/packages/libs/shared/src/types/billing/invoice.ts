/**
 * Invoice Types
 * International, jurisdiction-agnostic invoice management
 */

/** Invoice status enumeration */
export type InvoiceStatus =
  | "draft"
  | "pending"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled"
  | "refunded";

/** Invoice type enumeration */
export type InvoiceType =
  | "opd"
  | "ipd"
  | "pharmacy"
  | "laboratory"
  | "radiology"
  | "procedure"
  | "package"
  | "other";

/** Tax line (dynamic - replaces hardcoded CGST/SGST/IGST) */
export interface TaxLine {
  id: string;
  taxComponentId: string;
  componentCode: string;
  componentName: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  isExempt: boolean;
  exemptionReason?: string;
}

/** Invoice line item */
export interface InvoiceItem {
  id: string;
  serviceCode: string;
  serviceName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currencyCode: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  taxLines: TaxLine[];
  totalTax: number;
  totalAmount: number;
  lineNumber: number;
}

/** Full invoice with items */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  invoiceDate: string;
  dueDate?: string;
  patientId: string;
  patientName: string;
  patientMrn?: string;
  visitId?: string;

  // Jurisdiction and currency (international)
  jurisdictionId?: string;
  currencyCode: string;
  exchangeRate: number;
  baseCurrencyTotal?: number;

  // Amounts
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxLines: TaxLine[];
  totalTax: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;

  status: InvoiceStatus;
  isFinalized: boolean;
  items: InvoiceItem[];
}

/** Invoice summary for list views */
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  invoiceDate: string;
  patientName: string;
  currencyCode: string;
  grandTotal: number;
  balanceDue: number;
  status: InvoiceStatus;
}

/** Invoice search parameters */
export interface InvoiceSearchParams {
  patientId?: string;
  status?: InvoiceStatus;
  fromDate?: string;
  toDate?: string;
  currencyCode?: string;
  page?: number;
  pageSize?: number;
}

/** Invoice list response */
export interface InvoiceListResponse {
  data: InvoiceSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/** Request to create an invoice */
export interface CreateInvoiceRequest {
  invoiceType: InvoiceType;
  patientId: string;
  patientName: string;
  patientMrn?: string;
  visitId?: string;
  dueDate?: string;
  jurisdictionId?: string;
  currencyCode?: string;
  notes?: string;
}

/** Request to add an invoice item */
export interface AddInvoiceItemRequest {
  serviceId?: string;
  serviceCode: string;
  serviceName: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  currencyCode?: string;
  discountPercent?: number;
  // Tax is calculated automatically based on jurisdiction
  taxExempt?: boolean;
  taxExemptReason?: string;
}

/** Request to apply a discount */
export interface ApplyDiscountRequest {
  discountAmount: number;
  discountReason?: string;
}

/** Invoice creation response */
export interface CreateInvoiceResponse {
  id: string;
  invoiceNumber: string;
  success: boolean;
}

/** Add item response */
export interface AddInvoiceItemResponse {
  id: string;
  lineNumber: number;
  success: boolean;
}

/** Patient billing account */
export interface PatientBillingAccount {
  patientId: string;
  accountNumber: string;
  currentBalance: number;
  creditLimit: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  // International tax ID (not hardcoded to India)
  taxIdType?: string;
  taxIdNumber?: string;
  isActive: boolean;
}

/** Billing adjustment */
export interface BillingAdjustment {
  id: string;
  invoiceId: string;
  adjustmentType: "discount" | "writeoff" | "correction" | "refund" | "other";
  adjustmentAmount: number;
  currencyCode: string;
  reason: string;
  approvedBy?: string;
  createdAt: string;
}

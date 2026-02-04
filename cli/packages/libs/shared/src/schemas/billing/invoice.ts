/**
 * Invoice Schemas
 *
 * Runtime validation for invoice management.
 * International, jurisdiction-agnostic invoice handling.
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import { CurrencySchema, DateStringSchema } from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Invoice Enums
// ============================================================================

/**
 * Invoice status schema
 */
export const InvoiceStatusSchema = z.enum([
  "draft",
  "pending",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
]);

export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

/**
 * Invoice type schema
 */
export const InvoiceTypeSchema = z.enum([
  "opd",
  "ipd",
  "pharmacy",
  "laboratory",
  "radiology",
  "procedure",
  "package",
  "other",
]);

export type InvoiceType = z.infer<typeof InvoiceTypeSchema>;

// ============================================================================
// Tax Line Schema
// ============================================================================

/**
 * Tax line schema (dynamic tax components)
 */
export const TaxLineSchema = z.object({
  id: z.string().uuid(),
  taxComponentId: z.string().uuid(),
  componentCode: z.string(),
  componentName: z.string(),
  taxableAmount: CurrencySchema,
  taxRate: z.number().min(0).max(1), // 0-1 (e.g., 0.18 for 18%)
  taxAmount: CurrencySchema,
  isExempt: z.boolean(),
  exemptionReason: z.string().max(500).optional(),
});

export type TaxLine = z.infer<typeof TaxLineSchema>;

export const isTaxLine = createTypeGuard(TaxLineSchema);

// ============================================================================
// Invoice Item Schema
// ============================================================================

/**
 * Invoice line item schema
 */
export const InvoiceItemSchema = z.object({
  id: z.string().uuid(),
  serviceCode: z.string().min(1).max(100),
  serviceName: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  quantity: z.number().positive(),
  unit: z.string().max(50),
  unitPrice: CurrencySchema,
  currencyCode: z.string().length(3), // ISO 4217 currency code
  grossAmount: CurrencySchema,
  discountAmount: CurrencySchema,
  netAmount: CurrencySchema,
  taxLines: z.array(TaxLineSchema),
  totalTax: CurrencySchema,
  totalAmount: CurrencySchema,
  lineNumber: z.number().int().positive(),
}).refine(
  // Business rule: grossAmount = quantity * unitPrice
  data => Math.abs(data.grossAmount - (data.quantity * data.unitPrice)) < 0.01,
  {
    message: "Gross amount must equal quantity times unit price",
    path: ["grossAmount"],
  }
).refine(
  // Business rule: netAmount = grossAmount - discountAmount
  data => Math.abs(data.netAmount - (data.grossAmount - data.discountAmount)) < 0.01,
  {
    message: "Net amount must equal gross amount minus discount",
    path: ["netAmount"],
  }
).refine(
  // Business rule: totalAmount = netAmount + totalTax
  data => Math.abs(data.totalAmount - (data.netAmount + data.totalTax)) < 0.01,
  {
    message: "Total amount must equal net amount plus total tax",
    path: ["totalAmount"],
  }
);

export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

export const isInvoiceItem = createTypeGuard(InvoiceItemSchema);

// ============================================================================
// Invoice Schema
// ============================================================================

/**
 * Full invoice schema
 */
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string().min(1).max(100),
  invoiceType: InvoiceTypeSchema,
  invoiceDate: DateStringSchema,
  dueDate: DateStringSchema.optional(),
  patientId: z.string().uuid(),
  patientName: z.string().min(1),
  patientMrn: z.string().optional(),
  visitId: z.string().uuid().optional(),

  // Jurisdiction and currency (international)
  jurisdictionId: z.string().uuid().optional(),
  currencyCode: z.string().length(3),
  exchangeRate: z.number().positive(),
  baseCurrencyTotal: CurrencySchema.optional(),

  // Amounts
  subtotal: CurrencySchema,
  discountAmount: CurrencySchema,
  taxableAmount: CurrencySchema,
  taxLines: z.array(TaxLineSchema),
  totalTax: CurrencySchema,
  grandTotal: CurrencySchema,
  amountPaid: CurrencySchema,
  balanceDue: CurrencySchema,

  status: InvoiceStatusSchema,
  isFinalized: z.boolean(),
  items: z.array(InvoiceItemSchema),
}).refine(
  // Business rule: balanceDue = grandTotal - amountPaid
  data => Math.abs(data.balanceDue - (data.grandTotal - data.amountPaid)) < 0.01,
  {
    message: "Balance due must equal grand total minus amount paid",
    path: ["balanceDue"],
  }
).refine(
  // Business rule: grandTotal = taxableAmount + totalTax
  data => Math.abs(data.grandTotal - (data.taxableAmount + data.totalTax)) < 0.01,
  {
    message: "Grand total must equal taxable amount plus total tax",
    path: ["grandTotal"],
  }
);

export type Invoice = z.infer<typeof InvoiceSchema>;

export const isInvoice = createTypeGuard(InvoiceSchema);
export const assertInvoice = createAssertion(InvoiceSchema, 'Invoice');

// ============================================================================
// Invoice Summary Schema
// ============================================================================

export const InvoiceSummarySchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  invoiceType: InvoiceTypeSchema,
  invoiceDate: DateStringSchema,
  patientName: z.string(),
  currencyCode: z.string().length(3),
  grandTotal: CurrencySchema,
  balanceDue: CurrencySchema,
  status: InvoiceStatusSchema,
});

export type InvoiceSummary = z.infer<typeof InvoiceSummarySchema>;

export const isInvoiceSummary = createTypeGuard(InvoiceSummarySchema);

// ============================================================================
// Request Schemas
// ============================================================================

export const InvoiceSearchParamsSchema = z.object({
  patientId: z.string().uuid().optional(),
  status: InvoiceStatusSchema.optional(),
  fromDate: DateStringSchema.optional(),
  toDate: DateStringSchema.optional(),
  currencyCode: z.string().length(3).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type InvoiceSearchParams = z.infer<typeof InvoiceSearchParamsSchema>;

export const CreateInvoiceRequestSchema = z.object({
  invoiceType: InvoiceTypeSchema,
  patientId: z.string().uuid(),
  patientName: z.string().min(1),
  patientMrn: z.string().optional(),
  visitId: z.string().uuid().optional(),
  dueDate: DateStringSchema.optional(),
  jurisdictionId: z.string().uuid().optional(),
  currencyCode: z.string().length(3).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateInvoiceRequest = z.infer<typeof CreateInvoiceRequestSchema>;

export const AddInvoiceItemRequestSchema = z.object({
  serviceId: z.string().uuid().optional(),
  serviceCode: z.string().min(1).max(100),
  serviceName: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  quantity: z.number().positive(),
  unit: z.string().max(50).optional(),
  unitPrice: CurrencySchema,
  currencyCode: z.string().length(3).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxExempt: z.boolean().optional(),
  taxExemptReason: z.string().max(500).optional(),
});

export type AddInvoiceItemRequest = z.infer<typeof AddInvoiceItemRequestSchema>;

export const ApplyDiscountRequestSchema = z.object({
  discountAmount: CurrencySchema,
  discountReason: z.string().max(500).optional(),
});

export type ApplyDiscountRequest = z.infer<typeof ApplyDiscountRequestSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const CreateInvoiceResponseSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  success: z.boolean(),
});

export type CreateInvoiceResponse = z.infer<typeof CreateInvoiceResponseSchema>;

export const AddInvoiceItemResponseSchema = z.object({
  id: z.string().uuid(),
  lineNumber: z.number().int().positive(),
  success: z.boolean(),
});

export type AddInvoiceItemResponse = z.infer<typeof AddInvoiceItemResponseSchema>;

// ============================================================================
// Billing Account Schema
// ============================================================================

export const PatientBillingAccountSchema = z.object({
  patientId: z.string().uuid(),
  accountNumber: z.string(),
  currentBalance: CurrencySchema,
  creditLimit: CurrencySchema,
  lastPaymentDate: DateStringSchema.optional(),
  lastPaymentAmount: CurrencySchema.optional(),
  taxIdType: z.string().optional(),
  taxIdNumber: z.string().optional(),
  isActive: z.boolean(),
});

export type PatientBillingAccount = z.infer<typeof PatientBillingAccountSchema>;

// ============================================================================
// Billing Adjustment Schema
// ============================================================================

export const BillingAdjustmentSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  adjustmentType: z.enum(["discount", "writeoff", "correction", "refund", "other"]),
  adjustmentAmount: CurrencySchema,
  currencyCode: z.string().length(3),
  reason: z.string().min(1).max(500),
  approvedBy: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
});

export type BillingAdjustment = z.infer<typeof BillingAdjustmentSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

export function isInvoicePaid(invoice: Invoice): boolean {
  return invoice.status === "paid";
}

export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (!invoice.dueDate || invoice.status === "paid") {
    return false;
  }
  return new Date(invoice.dueDate) < new Date();
}

export function canFinalizeInvoice(invoice: Invoice): boolean {
  return !invoice.isFinalized && invoice.items.length > 0;
}

export function calculateInvoiceTotal(items: InvoiceItem[]): number {
  return items.reduce((sum, item) => sum + item.totalAmount, 0);
}

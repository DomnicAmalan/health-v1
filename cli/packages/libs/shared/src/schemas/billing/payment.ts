/**
 * Payment Schemas
 *
 * Runtime validation for payment processing and allocation.
 * International, multi-currency support.
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import { CurrencySchema, DateStringSchema, DateTimeSchema } from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Payment Enums
// ============================================================================

/**
 * Payment method schema (international)
 */
export const PaymentMethodSchema = z.enum([
  "cash",
  "card",
  "bank_transfer",
  "mobile_payment",
  "cheque",
  "draft",
  "wallet",
  "credit",
  "insurance",
  "cryptocurrency",
  "other",
]);

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/**
 * Payment status schema
 */
export const PaymentStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "refunded",
]);

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

// ============================================================================
// Payment Details Schemas
// ============================================================================

/**
 * Card payment details schema
 */
export const CardPaymentDetailsSchema = z.object({
  cardNetwork: z.enum(["visa", "mastercard", "amex", "discover", "unionpay", "jcb", "other"]),
  lastFourDigits: z.string().regex(/^\d{4}$/, { message: "Must be exactly 4 digits" }),
  cardHolderName: z.string().max(100).optional(),
  approvalCode: z.string().max(50).optional(),
  cardCountry: z.string().length(2).optional(), // ISO country code
});

export type CardPaymentDetails = z.infer<typeof CardPaymentDetailsSchema>;

/**
 * Mobile payment details schema
 */
export const MobilePaymentDetailsSchema = z.object({
  provider: z.string().max(100), // "UPI", "Apple Pay", "Google Pay", "Alipay", etc.
  accountId: z.string().max(200).optional(),
  transactionRef: z.string().max(200).optional(),
});

export type MobilePaymentDetails = z.infer<typeof MobilePaymentDetailsSchema>;

/**
 * Bank transfer details schema
 */
export const BankTransferDetailsSchema = z.object({
  bankName: z.string().max(200),
  accountNumber: z.string().max(50).optional(),
  routingNumber: z.string().max(50).optional(),
  swiftCode: z.string().max(11).optional(),
  iban: z.string().max(34).optional(),
  transactionRef: z.string().max(200).optional(),
});

export type BankTransferDetails = z.infer<typeof BankTransferDetailsSchema>;

/**
 * Cheque/Draft payment details schema
 */
export const ChequePaymentDetailsSchema = z.object({
  chequeNumber: z.string().max(50),
  bankName: z.string().max(200),
  branchName: z.string().max(200).optional(),
  chequeDate: DateStringSchema,
  clearingCode: z.string().max(50).optional(),
});

export type ChequePaymentDetails = z.infer<typeof ChequePaymentDetailsSchema>;

/**
 * Union type for payment details
 */
export const PaymentDetailsSchema = z.union([
  CardPaymentDetailsSchema,
  MobilePaymentDetailsSchema,
  BankTransferDetailsSchema,
  ChequePaymentDetailsSchema,
]);

export type PaymentDetails = z.infer<typeof PaymentDetailsSchema>;

// ============================================================================
// Payment Schema
// ============================================================================

/**
 * Full payment record schema
 */
export const PaymentSchema = z.object({
  id: z.string().uuid(),
  receiptNumber: z.string().min(1).max(100),
  paymentDate: DateStringSchema,
  patientId: z.string().uuid(),
  patientName: z.string().optional(),
  payerName: z.string().max(200).optional(),

  // Amount and currency
  amount: CurrencySchema,
  currencyCode: z.string().length(3),
  exchangeRate: z.number().positive(),
  baseCurrencyAmount: CurrencySchema.optional(),

  paymentMethod: PaymentMethodSchema,
  paymentStatus: PaymentStatusSchema,
  transactionId: z.string().max(200).optional(),
  isAdvance: z.boolean(),
  isAllocated: z.boolean(),
  notes: z.string().max(2000).optional(),
});

export type Payment = z.infer<typeof PaymentSchema>;

export const isPayment = createTypeGuard(PaymentSchema);
export const assertPayment = createAssertion(PaymentSchema, 'Payment');

// ============================================================================
// Payment Allocation Schema
// ============================================================================

/**
 * Payment allocation to invoice schema
 */
export const PaymentAllocationSchema = z.object({
  id: z.string().uuid(),
  paymentId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  allocatedAmount: CurrencySchema,
  currencyCode: z.string().length(3),
  allocatedAt: DateTimeSchema,
});

export type PaymentAllocation = z.infer<typeof PaymentAllocationSchema>;

export const isPaymentAllocation = createTypeGuard(PaymentAllocationSchema);

// ============================================================================
// Request Schemas
// ============================================================================

export const PaymentSearchParamsSchema = z.object({
  patientId: z.string().uuid().optional(),
  fromDate: DateStringSchema.optional(),
  toDate: DateStringSchema.optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  currencyCode: z.string().length(3).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type PaymentSearchParams = z.infer<typeof PaymentSearchParamsSchema>;

export const CreatePaymentRequestSchema = z.object({
  patientId: z.string().uuid(),
  patientName: z.string().optional(),
  payerName: z.string().max(200).optional(),
  amount: CurrencySchema,
  currencyCode: z.string().length(3).optional(),
  paymentMethod: PaymentMethodSchema,
  paymentDetails: PaymentDetailsSchema.optional(),
  transactionId: z.string().max(200).optional(),
  bankReference: z.string().max(200).optional(),
  isAdvance: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreatePaymentRequest = z.infer<typeof CreatePaymentRequestSchema>;

export const AllocatePaymentRequestSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: CurrencySchema,
});

export type AllocatePaymentRequest = z.infer<typeof AllocatePaymentRequestSchema>;

export const RefundPaymentRequestSchema = z.object({
  amount: CurrencySchema,
  reason: z.string().min(1, { message: "Refund reason is required" }).max(500),
});

export type RefundPaymentRequest = z.infer<typeof RefundPaymentRequestSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const CreatePaymentResponseSchema = z.object({
  id: z.string().uuid(),
  receiptNumber: z.string(),
  success: z.boolean(),
});

export type CreatePaymentResponse = z.infer<typeof CreatePaymentResponseSchema>;

export const PatientBalanceResponseSchema = z.object({
  patientId: z.string().uuid(),
  currencyCode: z.string().length(3),
  currentBalance: CurrencySchema,
  totalBilled: CurrencySchema,
  totalPaid: CurrencySchema,
  advanceBalance: CurrencySchema,
  pendingInvoices: z.number().int().nonnegative(),
});

export type PatientBalanceResponse = z.infer<typeof PatientBalanceResponseSchema>;

export const PaymentReceiptSchema = z.object({
  receiptNumber: z.string(),
  paymentDate: DateStringSchema,
  patientName: z.string(),
  patientMrn: z.string().optional(),

  // Amount and currency
  amount: CurrencySchema,
  currencyCode: z.string().length(3),
  amountInWords: z.string(),

  paymentMethod: PaymentMethodSchema,
  receivedBy: z.string().optional(),
  notes: z.string().max(2000).optional(),

  // Organization details (jurisdiction-agnostic)
  organizationName: z.string(),
  organizationAddress: z.string().optional(),
  organizationTaxId: z.string().optional(),
  organizationTaxIdType: z.string().optional(),
});

export type PaymentReceipt = z.infer<typeof PaymentReceiptSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

export function isPaymentCompleted(payment: Payment): boolean {
  return payment.paymentStatus === "completed";
}

export function isPaymentRefunded(payment: Payment): boolean {
  return payment.paymentStatus === "refunded";
}

export function isAdvancePayment(payment: Payment): boolean {
  return payment.isAdvance;
}

export function canAllocatePayment(payment: Payment): boolean {
  return payment.paymentStatus === "completed" && !payment.isAllocated;
}

export function canRefundPayment(payment: Payment): boolean {
  return payment.paymentStatus === "completed";
}

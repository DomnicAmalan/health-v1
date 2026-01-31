/**
 * Payment Types
 * Payment processing and allocation
 * International, multi-currency support
 */

/** Payment method enumeration (international) */
export type PaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "mobile_payment"
  | "cheque"
  | "draft"
  | "wallet"
  | "credit"
  | "insurance"
  | "cryptocurrency"
  | "other";

/** Payment status enumeration */
export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded";

/** Payment record */
export interface Payment {
  id: string;
  receiptNumber: string;
  paymentDate: string;
  patientId: string;
  patientName?: string;
  payerName?: string;

  // Amount and currency
  amount: number;
  currencyCode: string;
  exchangeRate: number;
  baseCurrencyAmount?: number;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  isAdvance: boolean;
  isAllocated: boolean;
  notes?: string;
}

/** Payment allocation to invoice */
export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  allocatedAmount: number;
  currencyCode: string;
  allocatedAt: string;
}

/** Payment search parameters */
export interface PaymentSearchParams {
  patientId?: string;
  fromDate?: string;
  toDate?: string;
  paymentMethod?: PaymentMethod;
  currencyCode?: string;
  page?: number;
  pageSize?: number;
}

/** Payment list response */
export interface PaymentListResponse {
  data: Payment[];
  total: number;
  page: number;
  pageSize: number;
}

/** Card payment details (international) */
export interface CardPaymentDetails {
  cardNetwork: "visa" | "mastercard" | "amex" | "discover" | "unionpay" | "jcb" | "other";
  lastFourDigits: string;
  cardHolderName?: string;
  approvalCode?: string;
  cardCountry?: string;
}

/** Mobile payment details (replaces India-specific UPI) */
export interface MobilePaymentDetails {
  provider: string; // "UPI", "Apple Pay", "Google Pay", "Alipay", "WeChat Pay", etc.
  accountId?: string;
  transactionRef?: string;
}

/** Bank transfer details */
export interface BankTransferDetails {
  bankName: string;
  accountNumber?: string;
  routingNumber?: string; // US: routing, UK: sort code, etc.
  swiftCode?: string;
  iban?: string;
  transactionRef?: string;
}

/** Cheque/Draft payment details */
export interface ChequePaymentDetails {
  chequeNumber: string;
  bankName: string;
  branchName?: string;
  chequeDate: string;
  clearingCode?: string;
}

/** Union type for payment details */
export type PaymentDetails =
  | CardPaymentDetails
  | MobilePaymentDetails
  | BankTransferDetails
  | ChequePaymentDetails;

/** Request to create a payment */
export interface CreatePaymentRequest {
  patientId: string;
  patientName?: string;
  payerName?: string;
  amount: number;
  currencyCode?: string;
  paymentMethod: PaymentMethod;
  paymentDetails?: PaymentDetails;
  transactionId?: string;
  bankReference?: string;
  isAdvance?: boolean;
  notes?: string;
}

/** Request to allocate a payment to an invoice */
export interface AllocatePaymentRequest {
  invoiceId: string;
  amount: number;
}

/** Request to refund a payment */
export interface RefundPaymentRequest {
  amount: number;
  reason: string;
}

/** Payment creation response */
export interface CreatePaymentResponse {
  id: string;
  receiptNumber: string;
  success: boolean;
}

/** Patient billing balance summary */
export interface PatientBalanceResponse {
  patientId: string;
  currencyCode: string;
  currentBalance: number;
  totalBilled: number;
  totalPaid: number;
  advanceBalance: number;
  pendingInvoices: number;
}

/** Receipt for printing (international) */
export interface PaymentReceipt {
  receiptNumber: string;
  paymentDate: string;
  patientName: string;
  patientMrn?: string;

  // Amount and currency
  amount: number;
  currencyCode: string;
  amountInWords: string;

  paymentMethod: PaymentMethod;
  receivedBy?: string;
  notes?: string;

  // Organization details (jurisdiction-agnostic)
  organizationName: string;
  organizationAddress?: string;
  organizationTaxId?: string;
  organizationTaxIdType?: string;
}

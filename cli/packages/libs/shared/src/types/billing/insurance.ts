/**
 * Insurance Types
 * Insurance payers, policies, pre-authorization, and claims
 * International, jurisdiction-agnostic
 */

/** Pre-authorization status */
export type PreauthStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "partially_approved"
  | "denied"
  | "expired"
  | "cancelled";

/** Claim status */
export type ClaimStatus =
  | "draft"
  | "submitted"
  | "acknowledged"
  | "under_review"
  | "approved"
  | "partially_approved"
  | "denied"
  | "paid"
  | "partially_paid"
  | "closed"
  | "cancelled";

/** Insurance payer (TPA or Insurance Company) */
export interface InsurancePayer {
  id: string;
  code: string;
  name: string;
  payerType: "insurance_company" | "tpa" | "government" | "corporate";

  // Contact info
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Address (international)
  address?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  countryCode?: string;

  // Tax identification (jurisdiction-agnostic)
  taxIdType?: string; // "GSTIN", "VAT", "EIN", etc.
  taxIdNumber?: string;

  // Currency this payer operates in
  currencyCode?: string;

  isActive: boolean;
}

/** Insurance plan */
export interface InsurancePlan {
  id: string;
  payerId: string;
  planCode: string;
  planName: string;
  planType: "individual" | "family" | "group" | "corporate";
  coverageType: "cashless" | "reimbursement" | "both";

  // Coverage amounts (in plan's currency)
  currencyCode: string;
  maxCoverage?: number;
  deductible?: number;
  copayPercent?: number;
  roomRentLimit?: number;

  // Waiting periods (in days)
  preExistingWaitingPeriod?: number;

  isActive: boolean;
}

/** Patient insurance policy */
export interface PatientInsurancePolicy {
  id: string;
  patientId: string;
  payerId: string;
  payerName?: string;
  planId: string;
  planName?: string;
  policyNumber: string;
  memberId?: string;
  groupNumber?: string;
  relationToHolder: "self" | "spouse" | "child" | "parent" | "other";
  holderName?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isPrimary: boolean;
  isActive: boolean;
}

/** Insurance pre-authorization request */
export interface InsurancePreauth {
  id: string;
  preauthNumber?: string;
  patientId: string;
  policyId: string;
  visitId?: string;
  admissionDate?: string;
  expectedDischargeDate?: string;

  // Diagnosis and procedures (using standard code systems)
  diagnosisCodes: string[]; // ICD-10
  procedureCodes: string[]; // CPT/HCPCS or local codes

  // Amounts (in policy currency)
  currencyCode: string;
  estimatedAmount: number;
  approvedAmount?: number;

  approvalNumber?: string;
  approvalDate?: string;
  expiryDate?: string;
  status: PreauthStatus;
  remarks?: string;
  denialReason?: string;
  documents: PreauthDocument[];
  createdAt: string;
  updatedAt: string;
}

/** Document attached to pre-auth */
export interface PreauthDocument {
  id: string;
  documentType: "id_proof" | "policy_card" | "prescription" | "report" | "referral" | "other";
  fileName: string;
  fileUrl?: string;
  uploadedAt: string;
}

/** Insurance claim */
export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  policyId: string;
  invoiceId: string;
  preauthId?: string;
  admissionDate?: string;
  dischargeDate?: string;

  // Diagnosis and procedures (using standard code systems)
  diagnosisCodes: string[]; // ICD-10
  procedureCodes: string[]; // CPT/HCPCS or local codes

  // Amounts (in claim currency)
  currencyCode: string;
  totalBilledAmount: number;
  claimedAmount: number;
  approvedAmount?: number;
  paidAmount?: number;
  deductedAmount?: number;
  deductionReasons?: string[];

  status: ClaimStatus;
  submittedAt?: string;
  acknowledgedAt?: string;
  settledAt?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

/** Claim history entry */
export interface ClaimHistoryEntry {
  id: string;
  claimId: string;
  previousStatus?: ClaimStatus;
  newStatus: ClaimStatus;
  remarks?: string;
  changedBy?: string;
  changedAt: string;
}

/** Request to create a pre-authorization */
export interface CreatePreauthRequest {
  patientId: string;
  policyId: string;
  visitId?: string;
  admissionDate?: string;
  expectedDischargeDate?: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  estimatedAmount: number;
  remarks?: string;
}

/** Request to submit a claim */
export interface SubmitClaimRequest {
  patientId: string;
  policyId: string;
  invoiceId: string;
  preauthId?: string;
  admissionDate?: string;
  dischargeDate?: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  remarks?: string;
}

/** Pre-authorization list response */
export interface PreauthListResponse {
  data: InsurancePreauth[];
  total: number;
  page: number;
  pageSize: number;
}

/** Claim list response */
export interface ClaimListResponse {
  data: InsuranceClaim[];
  total: number;
  page: number;
  pageSize: number;
}

/** Search parameters for pre-authorizations */
export interface PreauthSearchParams {
  patientId?: string;
  policyId?: string;
  status?: PreauthStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

/** Search parameters for claims */
export interface ClaimSearchParams {
  patientId?: string;
  policyId?: string;
  status?: ClaimStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

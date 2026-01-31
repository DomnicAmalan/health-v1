/**
 * EHR Order types
 * Corresponds to VistA File #100 (^OR)
 */

import type { EhrAuditFields } from "./common";

/** Order type */
export type EhrOrderType =
  | "lab"
  | "radiology"
  | "medication"
  | "consult"
  | "procedure"
  | "diet"
  | "nursing"
  | "activity"
  | "other";

/** Order status */
export type EhrOrderStatus =
  | "pending"
  | "active"
  | "completed"
  | "discontinued"
  | "cancelled"
  | "expired"
  | "held";

/** Order urgency */
export type EhrOrderUrgency = "stat" | "asap" | "routine" | "timed";

/** EHR Order entity */
export interface EhrOrder extends EhrAuditFields {
  id: string;
  ien: number;
  organizationId: string;
  patientId: string;
  visitId?: string;

  orderType: EhrOrderType;
  orderText: string;
  orderableCode?: string;

  status: EhrOrderStatus;
  urgency: EhrOrderUrgency;

  startDatetime: string;
  stopDatetime?: string;

  orderingProviderId: string;
  orderingProviderName?: string;

  signedBy?: string;
  signedDatetime?: string;

  discontinuedBy?: string;
  discontinuedDatetime?: string;
  discontinuedReason?: string;

  instructions?: string;
  indication?: string;
  diagnosisCode?: string;

  orderDetails?: Record<string, unknown>;
  mumpsData?: Record<string, unknown>;
}

/** Order creation request */
export interface CreateEhrOrderRequest {
  patientId: string;
  visitId?: string;
  orderType: EhrOrderType;
  orderText: string;
  orderableCode?: string;
  urgency?: EhrOrderUrgency;
  instructions?: string;
  indication?: string;
  diagnosisCode?: string;
  orderDetails?: Record<string, unknown>;
}

/** Order update request */
export interface UpdateEhrOrderRequest extends Partial<CreateEhrOrderRequest> {
  id: string;
}

/** Order discontinue request */
export interface DiscontinueEhrOrderRequest {
  id: string;
  reason?: string;
}

/** Order search criteria */
export interface EhrOrderSearchCriteria {
  patientId?: string;
  visitId?: string;
  orderType?: EhrOrderType;
  status?: EhrOrderStatus;
  urgency?: EhrOrderUrgency;
  orderingProviderId?: string;
  orderText?: string;
  dateFrom?: string;
  dateTo?: string;
  activeOnly?: boolean;
  unsignedOnly?: boolean;
}

/** Lab order details */
export interface LabOrderDetails {
  testName: string;
  loincCode?: string;
  specimenType?: string;
  fasting?: boolean;
  collectionInstructions?: string;
}

/** Radiology order details */
export interface RadiologyOrderDetails {
  procedureName: string;
  modality?: string;
  bodyPart?: string;
  laterality?: string;
  contrast?: boolean;
  transportMode?: string;
}

/** Medication order details */
export interface MedicationOrderDetails {
  drugName: string;
  rxnormCode?: string;
  dosage: string;
  route: string;
  frequency: string;
  duration?: string;
  prn?: boolean;
  prnReason?: string;
}

/**
 * EHR Lab Result types
 * Corresponds to VistA File #63 (^LR)
 */

import type { EhrAuditFields } from "./common";

/** Lab result status */
export type EhrLabStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

/** Abnormality flag */
export type EhrAbnormalFlag =
  | "normal"
  | "low"
  | "high"
  | "critical_low"
  | "critical_high"
  | "abnormal";

/** EHR Lab Result entity */
export interface EhrLabResult extends EhrAuditFields {
  id: string;
  ien: number;
  organizationId: string;
  patientId: string;
  visitId?: string;
  orderId?: string;

  loincCode?: string;
  testName: string;
  category?: string;

  value: string;
  numericValue?: number;
  unit?: string;

  referenceRange?: string;
  referenceLow?: number;
  referenceHigh?: number;

  status: EhrLabStatus;
  abnormalFlag?: EhrAbnormalFlag;

  specimenType?: string;
  collectedAt?: string;
  receivedAt?: string;
  resultedAt?: string;

  performingLab?: string;
  orderingProviderId?: string;
  interpretation?: string;
  notes?: string;

  mumpsData?: Record<string, unknown>;
}

/** Lab result creation request */
export interface CreateEhrLabResultRequest {
  patientId: string;
  visitId?: string;
  orderId?: string;
  loincCode?: string;
  testName: string;
  category?: string;
  resultValue?: string;
  numericValue?: number;
  unit?: string;
  referenceRange?: string;
  referenceLow?: number;
  referenceHigh?: number;
  specimenType?: string;
  collectionDatetime?: string;
  comments?: string;
}

/** Lab result update request */
export interface UpdateEhrLabResultRequest extends Partial<CreateEhrLabResultRequest> {
  id: string;
  status?: EhrLabStatus;
}

/** Lab result search criteria */
export interface EhrLabSearchCriteria {
  patientId?: string;
  visitId?: string;
  orderId?: string;
  status?: EhrLabStatus;
  testName?: string;
  loincCode?: string;
  category?: string;
  abnormalFlag?: EhrAbnormalFlag;
  dateFrom?: string;
  dateTo?: string;
  abnormalOnly?: boolean;
  criticalOnly?: boolean;
}

/** Lab panel (group of related tests) */
export interface EhrLabPanel {
  panelName: string;
  loincCode: string;
  results: EhrLabResult[];
  collectionDatetime: string;
}

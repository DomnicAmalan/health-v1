/**
 * EHR Medication types
 * Corresponds to VistA File #52 (^PS)
 */

import type { EhrAuditFields } from "./common";

/** Medication status */
export type EhrMedicationStatus =
  | "active"
  | "completed"
  | "discontinued"
  | "on_hold"
  | "cancelled";

/** Medication type */
export type EhrMedicationType = "outpatient" | "inpatient" | "iv" | "prn";

/** EHR Medication entity */
export interface EhrMedication extends EhrAuditFields {
  id: string;
  ien: number;
  organizationId: string;
  patientId: string;
  visitId?: string;

  rxnormCode?: string;
  ndcCode?: string;
  drugName: string;
  brandName?: string;

  dosage: string;
  dosageForm?: string;
  route?: string;
  frequency: string;
  sig: string;

  quantity?: number;
  daysSupply?: number;
  refillsRemaining?: number;

  status: EhrMedicationStatus;
  medicationType: EhrMedicationType;

  startDate: string;
  endDate?: string;
  discontinuedDate?: string;
  discontinuedReason?: string;

  prescriberId?: string;
  pharmacy?: string;
  instructions?: string;

  mumpsData?: Record<string, unknown>;
}

/** Medication creation request */
export interface CreateEhrMedicationRequest {
  patientId: string;
  visitId?: string;
  rxnormCode?: string;
  drugName: string;
  dosage: string;
  route?: string;
  frequency: string;
  sig: string;
  quantity?: number;
  daysSupply?: number;
  refillsRemaining?: number;
  startDate?: string;
  instructions?: string;
}

/** Medication update request */
export interface UpdateEhrMedicationRequest extends Partial<CreateEhrMedicationRequest> {
  id: string;
  status?: EhrMedicationStatus;
  discontinuedReason?: string;
}

/** Medication search criteria */
export interface EhrMedicationSearchCriteria {
  patientId?: string;
  status?: EhrMedicationStatus;
  drugName?: string;
  rxnormCode?: string;
  prescriberId?: string;
  activeOnly?: boolean;
}

/**
 * EHR Problem List types
 * Corresponds to VistA File #9000011 (^AUPNPROB)
 */

import type { EhrAuditFields } from "./common";

/** Problem status */
export type EhrProblemStatus = "active" | "inactive" | "resolved";

/** Problem acuity */
export type EhrProblemAcuity = "acute" | "chronic";

/** EHR Problem entity */
export interface EhrProblem extends EhrAuditFields {
  id: string;
  ien: number;
  organizationId: string;
  patientId: string;
  visitId?: string;

  icd10Code?: string;
  snomedCode?: string;
  description: string;

  status: EhrProblemStatus;
  acuity: EhrProblemAcuity;

  onsetDate?: string;
  resolvedDate?: string;
  priority?: number;

  providerId?: string;
  notes?: string;

  mumpsData?: Record<string, unknown>;
}

/** Problem creation request */
export interface CreateEhrProblemRequest {
  patientId: string;
  visitId?: string;
  icd10Code?: string;
  snomedCode?: string;
  description: string;
  acuity?: EhrProblemAcuity;
  onsetDate?: string;
  priority?: number;
  notes?: string;
}

/** Problem update request */
export interface UpdateEhrProblemRequest extends Partial<CreateEhrProblemRequest> {
  id: string;
  status?: EhrProblemStatus;
  resolvedDate?: string;
}

/** Problem search criteria */
export interface EhrProblemSearchCriteria {
  patientId?: string;
  status?: EhrProblemStatus;
  icd10Code?: string;
  description?: string;
  providerId?: string;
}

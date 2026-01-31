/**
 * EHR Allergy types
 * Corresponds to VistA File #120.8 (^GMR)
 */

import type { EhrAuditFields } from "./common";

/** Allergy type */
export type EhrAllergyType = "drug" | "food" | "environmental" | "other";

/** Allergy severity */
export type EhrAllergySeverity = "mild" | "moderate" | "severe" | "life_threatening";

/** Allergy status */
export type EhrAllergyStatus = "active" | "inactive" | "entered_in_error";

/** EHR Allergy entity */
export interface EhrAllergy extends EhrAuditFields {
  id: string;
  ien: number;
  organizationId: string;
  patientId: string;

  allergen: string;
  allergyType: EhrAllergyType;
  severity: EhrAllergySeverity;
  status: EhrAllergyStatus;

  reactions?: string[];
  reactionDate?: string;
  onsetDate?: string;

  verified: boolean;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;

  source?: string;
  notes?: string;

  mumpsData?: Record<string, unknown>;
}

/** Allergy creation request */
export interface CreateEhrAllergyRequest {
  patientId: string;
  allergen: string;
  allergyType: EhrAllergyType;
  severity?: EhrAllergySeverity;
  reactions?: string;
  reactionDate?: string;
  source?: string;
  comments?: string;
}

/** Allergy update request */
export interface UpdateEhrAllergyRequest extends Partial<CreateEhrAllergyRequest> {
  id: string;
  status?: EhrAllergyStatus;
}

/** Allergy search criteria */
export interface EhrAllergySearchCriteria {
  patientId?: string;
  allergyType?: EhrAllergyType;
  status?: EhrAllergyStatus;
  allergen?: string;
  verifiedOnly?: boolean;
}

/**
 * EHR Patient types
 * Corresponds to VistA File #2 (^DPT)
 */

import type { EhrAuditFields } from "./common";

/** Patient gender */
export type EhrGender = "male" | "female" | "other" | "unknown";

/** Patient status */
export type EhrPatientStatus = "active" | "inactive" | "deceased";

/** EHR Patient entity */
export interface EhrPatient extends EhrAuditFields {
  id: string;
  /** VistA Internal Entry Number */
  ien: number;
  organizationId: string;

  // Name
  lastName: string;
  firstName: string;
  middleName?: string;
  suffix?: string;
  preferredName?: string;

  // Demographics
  dateOfBirth: string;
  gender: EhrGender;
  ssnLastFour?: string;
  mrn: string;

  // Contact
  email?: string;
  phoneHome?: string;
  phoneMobile?: string;
  phoneWork?: string;

  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;

  // Insurance
  insuranceCarrier?: string;
  insurancePolicyNumber?: string;
  insuranceGroupNumber?: string;

  // Status
  status: EhrPatientStatus;
  deceasedDate?: string;

  // Care team
  primaryProviderId?: string;
  primaryLocationId?: string;

  // MUMPS data
  mumpsData?: Record<string, unknown>;
}

/** Patient creation request */
export interface CreateEhrPatientRequest {
  lastName: string;
  firstName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: EhrGender;
  mrn?: string;
  email?: string;
  phoneHome?: string;
  phoneMobile?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

/** Patient update request */
export interface UpdateEhrPatientRequest extends Partial<CreateEhrPatientRequest> {
  id: string;
  status?: EhrPatientStatus;
  deceasedDate?: string;
  primaryProviderId?: string;
  primaryLocationId?: string;
}

/** Patient search criteria */
export interface EhrPatientSearchCriteria {
  name?: string;
  mrn?: string;
  dateOfBirth?: string;
  ssnLastFour?: string;
  status?: EhrPatientStatus;
  primaryProviderId?: string;
  primaryLocationId?: string;
}

/** Patient banner data (summary for display) */
export interface EhrPatientBanner {
  id: string;
  fullName: string;
  mrn: string;
  dateOfBirth: string;
  age: number;
  gender: EhrGender;
  status: EhrPatientStatus;
  allergies: string[];
  primaryProvider?: string;
}

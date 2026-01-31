/**
 * EHR Visit/Encounter types
 * Corresponds to VistA File #9000010 (^AUPNVSIT)
 */

import type { EhrAuditFields } from "./common";

/** Visit type */
export type EhrVisitType =
  | "outpatient"
  | "inpatient"
  | "emergency"
  | "telehealth"
  | "home"
  | "observation";

/** Visit status */
export type EhrVisitStatus =
  | "scheduled"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

/** EHR Visit entity */
export interface EhrVisit extends EhrAuditFields {
  id: string;
  ien: number;
  organizationId: string;
  patientId: string;

  visitType: EhrVisitType;
  status: EhrVisitStatus;
  visitDatetime: string;
  checkInTime?: string;
  checkOutTime?: string;

  locationId?: string;
  locationName?: string;
  providerId?: string;
  providerName?: string;

  chiefComplaint?: string;
  reasonForVisit?: string;
  serviceCategory?: string;
  disposition?: string;

  mumpsData?: Record<string, unknown>;
}

/** Visit creation request */
export interface CreateEhrVisitRequest {
  patientId: string;
  visitType: EhrVisitType;
  visitDatetime: string;
  locationId?: string;
  providerId?: string;
  chiefComplaint?: string;
  reasonForVisit?: string;
}

/** Visit update request */
export interface UpdateEhrVisitRequest extends Partial<CreateEhrVisitRequest> {
  id: string;
  status?: EhrVisitStatus;
  disposition?: string;
}

/** Visit search criteria */
export interface EhrVisitSearchCriteria {
  patientId?: string;
  visitType?: EhrVisitType;
  status?: EhrVisitStatus;
  providerId?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
}

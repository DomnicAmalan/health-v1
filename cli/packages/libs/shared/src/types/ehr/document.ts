/**
 * EHR Clinical Document types
 * Corresponds to VistA File #8925 (^TIU)
 */

import type { EhrAuditFields } from "./common";

/** Document status */
export type EhrDocumentStatus =
  | "draft"
  | "unsigned"
  | "signed"
  | "cosigned"
  | "amended"
  | "deleted";

/** Document type */
export type EhrDocumentType =
  | "progress_note"
  | "soap_note"
  | "h_and_p"
  | "discharge_summary"
  | "consultation"
  | "procedure_note"
  | "telephone_note"
  | "addendum"
  | "other";

/** Document type display names */
export const DOCUMENT_TYPE_NAMES: Record<EhrDocumentType, string> = {
  progress_note: "Progress Note",
  soap_note: "SOAP Note",
  h_and_p: "History & Physical",
  discharge_summary: "Discharge Summary",
  consultation: "Consultation",
  procedure_note: "Procedure Note",
  telephone_note: "Telephone Note",
  addendum: "Addendum",
  other: "Other",
};

/** EHR Document entity */
export interface EhrDocument extends EhrAuditFields {
  id: string;
  ien: number;
  organizationId: string;
  patientId: string;
  visitId?: string;

  documentType: EhrDocumentType;
  title: string;
  content: string;
  structuredContent?: Record<string, unknown>;
  templateId?: string;

  status: EhrDocumentStatus;

  authorId: string;
  authorName?: string;
  expectedSignerId?: string;

  signerId?: string;
  signerName?: string;
  signedDatetime?: string;

  cosignerId?: string;
  cosignerName?: string;
  cosignedDatetime?: string;

  referenceDatetime: string;
  parentDocumentId?: string;
  service?: string;
  locationId?: string;

  mumpsData?: Record<string, unknown>;
}

/** Document creation request */
export interface CreateEhrDocumentRequest {
  patientId: string;
  visitId?: string;
  documentType: EhrDocumentType;
  title: string;
  content: string;
  structuredContent?: Record<string, unknown>;
  templateId?: string;
  referenceDatetime?: string;
  service?: string;
}

/** Document update request */
export interface UpdateEhrDocumentRequest extends Partial<CreateEhrDocumentRequest> {
  id: string;
}

/** Document sign request */
export interface SignEhrDocumentRequest {
  id: string;
  signature?: string; // Digital signature if required
}

/** Document search criteria */
export interface EhrDocumentSearchCriteria {
  patientId?: string;
  visitId?: string;
  documentType?: EhrDocumentType;
  status?: EhrDocumentStatus;
  authorId?: string;
  signerId?: string;
  title?: string;
  contentSearch?: string;
  dateFrom?: string;
  dateTo?: string;
  service?: string;
  unsignedOnly?: boolean;
}

/** SOAP note structure */
export interface SoapNoteContent {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/** H&P note structure */
export interface HandPNoteContent {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  medications: string;
  allergies: string;
  socialHistory: string;
  familyHistory: string;
  reviewOfSystems: Record<string, string>;
  physicalExam: Record<string, string>;
  assessment: string;
  plan: string;
}

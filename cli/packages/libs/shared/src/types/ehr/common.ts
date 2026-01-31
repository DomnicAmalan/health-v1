/**
 * Common EHR types and utilities
 */

/** Audit fields included on all EHR entities */
export interface EhrAuditFields {
  requestId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  systemId?: string;
  version: number;
}

/** Pagination parameters */
export interface EhrPagination {
  limit: number;
  offset: number;
}

/** Paginated response */
export interface EhrPaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** Base search criteria */
export interface EhrBaseSearchCriteria {
  patientId?: string;
}

/** ICD-10 diagnosis code */
export interface Icd10Code {
  code: string;
  description: string;
}

/** LOINC code */
export interface LoincCode {
  code: string;
  name: string;
  component?: string;
}

/** RxNorm code */
export interface RxNormCode {
  rxcui: string;
  name: string;
  tty?: string;
}

/** SNOMED CT code */
export interface SnomedCode {
  conceptId: string;
  term: string;
}

/** Code search result */
export interface CodeSearchResult<T> {
  results: T[];
  total: number;
}

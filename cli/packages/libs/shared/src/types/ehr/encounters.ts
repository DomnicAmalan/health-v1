/**
 * Encounter Types
 * Clinical encounter (visit) data structures
 */

export interface Encounter {
  id: string;
  encounterNumber: string;
  patientId: string;
  providerId: string;
  organizationId: string;
  locationId?: string;

  // Encounter context
  encounterType: 'outpatient' | 'inpatient' | 'emergency' | 'telemedicine';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  encounterDatetime: string;
  checkoutDatetime?: string;

  // Clinical documentation
  visitReason?: string;
  chiefComplaint?: string;
  assessment?: string;
  plan?: string;

  // Coding
  icd10Codes: string[];
  cptCodes: string[];

  // VistA integration
  vistaIen?: string;

  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  deletedAt?: string;
}

export interface CreateEncounterRequest {
  patientId: string;
  providerId: string;
  organizationId: string;
  locationId?: string;
  encounterType: 'outpatient' | 'inpatient' | 'emergency' | 'telemedicine';
  encounterDatetime?: string; // Defaults to now
  visitReason?: string;
  chiefComplaint?: string;
}

export interface UpdateEncounterRequest {
  encounterType?: 'outpatient' | 'inpatient' | 'emergency' | 'telemedicine';
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  visitReason?: string;
  chiefComplaint?: string;
  assessment?: string;
  plan?: string;
  icd10Codes?: string[];
  cptCodes?: string[];
}

export interface ListEncountersFilters {
  patientId?: string;
  providerId?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  encounterType?: 'outpatient' | 'inpatient' | 'emergency' | 'telemedicine';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface EncounterListResponse {
  encounters: Encounter[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * EHR Vital Signs types
 * Corresponds to VistA File #120.5 (^GMR)
 */

import type { EhrAuditFields } from "./common";

/** Vital sign type */
export type EhrVitalType =
  | "blood_pressure"
  | "heart_rate"
  | "temperature"
  | "respiratory_rate"
  | "oxygen_saturation"
  | "height"
  | "weight"
  | "bmi"
  | "pain";

/** LOINC codes for vital types */
export const VITAL_LOINC_CODES: Record<EhrVitalType, string> = {
  blood_pressure: "85354-9",
  heart_rate: "8867-4",
  temperature: "8310-5",
  respiratory_rate: "9279-1",
  oxygen_saturation: "2708-6",
  height: "8302-2",
  weight: "29463-7",
  bmi: "39156-5",
  pain: "72514-3",
};

/** Standard units for vital types */
export const VITAL_UNITS: Record<EhrVitalType, string> = {
  blood_pressure: "mmHg",
  heart_rate: "bpm",
  temperature: "F",
  respiratory_rate: "/min",
  oxygen_saturation: "%",
  height: "in",
  weight: "lb",
  bmi: "kg/m2",
  pain: "/10",
};

/** EHR Vital entity */
export interface EhrVital extends EhrAuditFields {
  id: string;
  ien: number;
  organizationId: string;
  patientId: string;
  visitId?: string;

  vitalType: EhrVitalType;
  loincCode: string;

  value: number;
  value2?: number; // For blood pressure diastolic
  unit: string;

  measurementDatetime: string;
  recordedBy?: string;

  location?: string;
  method?: string;
  position?: string;
  comments?: string;
  abnormalFlag?: string;

  mumpsData?: Record<string, unknown>;
}

/** Vital creation request */
export interface CreateEhrVitalRequest {
  patientId: string;
  visitId?: string;
  vitalType: EhrVitalType;
  value: number;
  value2?: number;
  unit?: string;
  measurementDatetime?: string;
  location?: string;
  method?: string;
  position?: string;
  comments?: string;
}

/** Vital search criteria */
export interface EhrVitalSearchCriteria {
  patientId?: string;
  visitId?: string;
  vitalType?: EhrVitalType;
  dateFrom?: string;
  dateTo?: string;
  abnormalOnly?: boolean;
}

/** Latest vitals summary */
export interface EhrLatestVitals {
  bloodPressure?: { systolic: number; diastolic: number; datetime: string };
  heartRate?: { value: number; datetime: string };
  temperature?: { value: number; datetime: string };
  respiratoryRate?: { value: number; datetime: string };
  oxygenSaturation?: { value: number; datetime: string };
  height?: { value: number; datetime: string };
  weight?: { value: number; datetime: string };
  bmi?: { value: number; datetime: string };
  pain?: { value: number; datetime: string };
}

/**
 * EHR Vital Signs Schemas
 *
 * Runtime validation for vital sign measurements.
 * Corresponds to VistA File #120.5 (^GMR)
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import { DateTimeSchema } from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Vital Type Enum
// ============================================================================

/**
 * Vital sign type schema
 */
export const EhrVitalTypeSchema = z.enum([
  "blood_pressure",
  "heart_rate",
  "temperature",
  "respiratory_rate",
  "oxygen_saturation",
  "height",
  "weight",
  "bmi",
  "pain",
]);

export type EhrVitalType = z.infer<typeof EhrVitalTypeSchema>;

// ============================================================================
// Constants
// ============================================================================

/**
 * LOINC codes for vital types
 */
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

/**
 * Standard units for vital types
 */
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

// ============================================================================
// Vital Schema
// ============================================================================

/**
 * Full EHR Vital schema
 */
export const EhrVitalSchema = z.object({
  // Identity
  id: z.string().uuid(),
  ien: z.number().int().positive(),
  organizationId: z.string().uuid(),
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),

  // Vital type and coding
  vitalType: EhrVitalTypeSchema,
  loincCode: z.string(),

  // Measurement values
  value: z.number(),
  value2: z.number().optional(), // For blood pressure diastolic
  unit: z.string(),

  // Timing
  measurementDatetime: DateTimeSchema,
  recordedBy: z.string().uuid().optional(),

  // Context
  location: z.string().max(200).optional(),
  method: z.string().max(200).optional(),
  position: z.string().max(100).optional(),
  comments: z.string().max(1000).optional(),
  abnormalFlag: z.string().max(50).optional(),

  // Audit fields
  createdAt: DateTimeSchema.optional(),
  createdBy: z.string().optional(),
  updatedAt: DateTimeSchema.optional(),
  updatedBy: z.string().optional(),

  // MUMPS data
  mumpsData: z.record(z.string(), z.unknown()).optional(),
}).refine(
  // Business rule: Blood pressure must have value2 (diastolic)
  data => {
    if (data.vitalType === "blood_pressure") {
      return typeof data.value2 === "number";
    }
    return true;
  },
  {
    message: "Blood pressure measurements must include diastolic value (value2)",
    path: ["value2"],
  }
).refine(
  // Business rule: Validate reasonable ranges
  data => {
    switch (data.vitalType) {
      case "blood_pressure":
        // Systolic: 60-250, Diastolic: 40-150
        return data.value >= 60 && data.value <= 250 &&
               (!data.value2 || (data.value2 >= 40 && data.value2 <= 150));
      case "heart_rate":
        return data.value >= 30 && data.value <= 250;
      case "temperature":
        return data.value >= 90 && data.value <= 110; // Fahrenheit
      case "respiratory_rate":
        return data.value >= 5 && data.value <= 60;
      case "oxygen_saturation":
        return data.value >= 50 && data.value <= 100;
      case "height":
        return data.value >= 10 && data.value <= 100; // inches
      case "weight":
        return data.value >= 1 && data.value <= 1000; // pounds
      case "bmi":
        return data.value >= 10 && data.value <= 80;
      case "pain":
        return data.value >= 0 && data.value <= 10;
      default:
        return true;
    }
  },
  {
    message: "Vital value is outside acceptable range",
    path: ["value"],
  }
);

export type EhrVital = z.infer<typeof EhrVitalSchema>;

// Type guards
export const isEhrVital = createTypeGuard(EhrVitalSchema);

// Assertions
export const assertEhrVital = createAssertion(EhrVitalSchema, 'EhrVital');

// ============================================================================
// Create Vital Request Schema
// ============================================================================

/**
 * Create vital request validation
 */
export const CreateEhrVitalRequestSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  vitalType: EhrVitalTypeSchema,
  value: z.number(),
  value2: z.number().optional(),
  unit: z.string().optional(),
  measurementDatetime: DateTimeSchema.optional(),
  location: z.string().max(200).optional(),
  method: z.string().max(200).optional(),
  position: z.string().max(100).optional(),
  comments: z.string().max(1000).optional(),
});

export type CreateEhrVitalRequest = z.infer<typeof CreateEhrVitalRequestSchema>;

// Type guards
export const isCreateEhrVitalRequest = createTypeGuard(CreateEhrVitalRequestSchema);

// Assertions
export const assertCreateEhrVitalRequest = createAssertion(
  CreateEhrVitalRequestSchema,
  'CreateEhrVitalRequest'
);

// ============================================================================
// Vital Search Criteria Schema
// ============================================================================

/**
 * Vital search criteria validation
 */
export const EhrVitalSearchCriteriaSchema = z.object({
  patientId: z.string().uuid().optional(),
  visitId: z.string().uuid().optional(),
  vitalType: EhrVitalTypeSchema.optional(),
  dateFrom: DateTimeSchema.optional(),
  dateTo: DateTimeSchema.optional(),
  abnormalOnly: z.boolean().optional(),
});

export type EhrVitalSearchCriteria = z.infer<typeof EhrVitalSearchCriteriaSchema>;

// Type guards
export const isEhrVitalSearchCriteria = createTypeGuard(EhrVitalSearchCriteriaSchema);

// ============================================================================
// Latest Vitals Summary Schema
// ============================================================================

/**
 * Latest vitals summary validation
 */
export const EhrLatestVitalsSchema = z.object({
  bloodPressure: z.object({
    systolic: z.number(),
    diastolic: z.number(),
    datetime: DateTimeSchema,
  }).optional(),
  heartRate: z.object({
    value: z.number(),
    datetime: DateTimeSchema,
  }).optional(),
  temperature: z.object({
    value: z.number(),
    datetime: DateTimeSchema,
  }).optional(),
  respiratoryRate: z.object({
    value: z.number(),
    datetime: DateTimeSchema,
  }).optional(),
  oxygenSaturation: z.object({
    value: z.number(),
    datetime: DateTimeSchema,
  }).optional(),
  height: z.object({
    value: z.number(),
    datetime: DateTimeSchema,
  }).optional(),
  weight: z.object({
    value: z.number(),
    datetime: DateTimeSchema,
  }).optional(),
  bmi: z.object({
    value: z.number(),
    datetime: DateTimeSchema,
  }).optional(),
  pain: z.object({
    value: z.number(),
    datetime: DateTimeSchema,
  }).optional(),
});

export type EhrLatestVitals = z.infer<typeof EhrLatestVitalsSchema>;

// Type guards
export const isEhrLatestVitals = createTypeGuard(EhrLatestVitalsSchema);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get LOINC code for vital type
 */
export function getLoincCode(vitalType: EhrVitalType): string {
  return VITAL_LOINC_CODES[vitalType];
}

/**
 * Get unit for vital type
 */
export function getVitalUnit(vitalType: EhrVitalType): string {
  return VITAL_UNITS[vitalType];
}

/**
 * Check if vital is abnormal based on standard ranges
 */
export function isVitalAbnormal(vital: EhrVital): boolean {
  switch (vital.vitalType) {
    case "blood_pressure":
      // Hypertension: systolic ≥ 140 or diastolic ≥ 90
      // Hypotension: systolic < 90 or diastolic < 60
      return vital.value >= 140 || vital.value < 90 ||
             (vital.value2 !== undefined && (vital.value2 >= 90 || vital.value2 < 60));
    case "heart_rate":
      return vital.value < 60 || vital.value > 100;
    case "temperature":
      return vital.value < 97 || vital.value > 99.5; // Fahrenheit
    case "respiratory_rate":
      return vital.value < 12 || vital.value > 20;
    case "oxygen_saturation":
      return vital.value < 95;
    case "bmi":
      return vital.value < 18.5 || vital.value > 30;
    case "pain":
      return vital.value >= 7;
    default:
      return false;
  }
}

/**
 * Format vital value for display
 */
export function formatVitalValue(vital: EhrVital): string {
  if (vital.vitalType === "blood_pressure" && vital.value2) {
    return `${vital.value}/${vital.value2} ${vital.unit}`;
  }
  return `${vital.value} ${vital.unit}`;
}

/**
 * Calculate BMI from height and weight
 */
export function calculateBMI(heightInches: number, weightPounds: number): number {
  // BMI = (weight in pounds * 703) / (height in inches)^2
  return (weightPounds * 703) / (heightInches * heightInches);
}

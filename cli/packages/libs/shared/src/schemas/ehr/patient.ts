/**
 * EHR Patient Schemas
 *
 * Runtime validation for patient data with PHI protection.
 * Validates patient records, demographics, and PHI fields.
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import {
  EmailSchema,
  DateStringSchema,
  ZipCodeSchema,
  StateCodeSchema,
  NameSchema,
} from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Patient Enums
// ============================================================================

/**
 * Patient gender schema
 */
export const EhrGenderSchema = z.enum(['male', 'female', 'other', 'unknown']);

export type EhrGender = z.infer<typeof EhrGenderSchema>;

/**
 * Patient status schema
 */
export const EhrPatientStatusSchema = z.enum(['active', 'inactive', 'deceased']);

export type EhrPatientStatus = z.infer<typeof EhrPatientStatusSchema>;

// ============================================================================
// Patient Schema
// ============================================================================

/**
 * MRN (Medical Record Number) validation
 * Typically 7-10 alphanumeric characters
 */
export const MRNSchema = z
  .string()
  .min(1, { message: "MRN is required" })
  .max(20, { message: "MRN cannot exceed 20 characters" });

/**
 * SSN last 4 digits validation (PHI)
 */
export const SSNLastFourSchema = z
  .string()
  .regex(/^\d{4}$/, { message: "SSN last 4 must be exactly 4 digits" });

/**
 * Full EHR Patient schema
 */
export const EhrPatientSchema = z.object({
  // Identity
  id: z.string().uuid(),
  ien: z.number().int().positive(),
  organizationId: z.string().uuid(),

  // Name fields
  lastName: NameSchema,
  firstName: NameSchema,
  middleName: NameSchema.optional(),
  suffix: z.string().max(10).optional(),
  preferredName: z.string().max(100).optional(),

  // Demographics (PHI)
  dateOfBirth: DateStringSchema,
  gender: EhrGenderSchema,
  ssnLastFour: SSNLastFourSchema.optional(),
  mrn: MRNSchema,

  // Contact (PHI)
  email: EmailSchema.optional(),
  phoneHome: z.string().optional(),
  phoneMobile: z.string().optional(),
  phoneWork: z.string().optional(),

  // Address (PHI)
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: StateCodeSchema.optional(),
  zipCode: ZipCodeSchema.optional(),
  country: z.string().max(50).optional(),

  // Emergency contact (PHI)
  emergencyContactName: z.string().max(200).optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().max(100).optional(),

  // Insurance (PHI)
  insuranceCarrier: z.string().max(200).optional(),
  insurancePolicyNumber: z.string().max(100).optional(),
  insuranceGroupNumber: z.string().max(100).optional(),

  // Status
  status: EhrPatientStatusSchema,
  deceasedDate: DateStringSchema.optional(),

  // Care team
  primaryProviderId: z.string().optional(),
  primaryLocationId: z.string().optional(),

  // Audit fields
  createdAt: z.string().datetime().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
  updatedBy: z.string().optional(),

  // MUMPS data
  mumpsData: z.record(z.string(), z.unknown()).optional(),
}).refine(
  // Business rule: If deceased, must have deceased date
  data => {
    if (data.status === 'deceased') {
      return !!data.deceasedDate;
    }
    return true;
  },
  {
    message: "Deceased patients must have a deceased date",
    path: ['deceasedDate'],
  }
);

export type EhrPatient = z.infer<typeof EhrPatientSchema>;

// Type guards
export const isEhrPatient = createTypeGuard(EhrPatientSchema);

// Assertions
export const assertEhrPatient = createAssertion(EhrPatientSchema, 'EhrPatient');

// ============================================================================
// Create Patient Request Schema
// ============================================================================

/**
 * Create patient request validation
 */
export const CreateEhrPatientRequestSchema = z.object({
  lastName: NameSchema,
  firstName: NameSchema,
  middleName: NameSchema.optional(),
  dateOfBirth: DateStringSchema,
  gender: EhrGenderSchema,
  mrn: MRNSchema.optional(),
  email: EmailSchema.optional(),
  phoneHome: z.string().optional(),
  phoneMobile: z.string().optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: StateCodeSchema.optional(),
  zipCode: ZipCodeSchema.optional(),
});

export type CreateEhrPatientRequest = z.infer<typeof CreateEhrPatientRequestSchema>;

// Type guards
export const isCreateEhrPatientRequest = createTypeGuard(CreateEhrPatientRequestSchema);

// Assertions
export const assertCreateEhrPatientRequest = createAssertion(
  CreateEhrPatientRequestSchema,
  'CreateEhrPatientRequest'
);

// ============================================================================
// Update Patient Request Schema
// ============================================================================

/**
 * Update patient request validation
 */
export const UpdateEhrPatientRequestSchema = CreateEhrPatientRequestSchema.partial().extend({
  id: z.string().uuid(),
  status: EhrPatientStatusSchema.optional(),
  deceasedDate: DateStringSchema.optional(),
  primaryProviderId: z.string().optional(),
  primaryLocationId: z.string().optional(),
}).refine(
  // Business rule: If setting status to deceased, must provide deceased date
  data => {
    if (data.status === 'deceased') {
      return !!data.deceasedDate;
    }
    return true;
  },
  {
    message: "Must provide deceased date when marking patient as deceased",
    path: ['deceasedDate'],
  }
);

export type UpdateEhrPatientRequest = z.infer<typeof UpdateEhrPatientRequestSchema>;

// Type guards
export const isUpdateEhrPatientRequest = createTypeGuard(UpdateEhrPatientRequestSchema);

// Assertions
export const assertUpdateEhrPatientRequest = createAssertion(
  UpdateEhrPatientRequestSchema,
  'UpdateEhrPatientRequest'
);

// ============================================================================
// Patient Search Schema
// ============================================================================

/**
 * Patient search criteria validation
 */
export const EhrPatientSearchCriteriaSchema = z.object({
  name: z.string().optional(),
  mrn: MRNSchema.optional(),
  dateOfBirth: DateStringSchema.optional(),
  ssnLastFour: SSNLastFourSchema.optional(),
  status: EhrPatientStatusSchema.optional(),
  primaryProviderId: z.string().optional(),
  primaryLocationId: z.string().optional(),
});

export type EhrPatientSearchCriteria = z.infer<typeof EhrPatientSearchCriteriaSchema>;

// Type guards
export const isEhrPatientSearchCriteria = createTypeGuard(EhrPatientSearchCriteriaSchema);

// ============================================================================
// Patient Banner Schema
// ============================================================================

/**
 * Patient banner (summary) validation
 */
export const EhrPatientBannerSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  mrn: MRNSchema,
  dateOfBirth: DateStringSchema,
  age: z.number().int().nonnegative(),
  gender: EhrGenderSchema,
  status: EhrPatientStatusSchema,
  allergies: z.array(z.string()),
  primaryProvider: z.string().optional(),
});

export type EhrPatientBanner = z.infer<typeof EhrPatientBannerSchema>;

// Type guards
export const isEhrPatientBanner = createTypeGuard(EhrPatientBannerSchema);

// Assertions
export const assertEhrPatientBanner = createAssertion(EhrPatientBannerSchema, 'EhrPatientBanner');

// ============================================================================
// PHI Detection Helpers
// ============================================================================

/**
 * Check if patient has insurance information (PHI)
 */
export function hasInsurance(
  patient: EhrPatient
): patient is EhrPatient & {
  insuranceCarrier: string;
  insurancePolicyNumber: string;
} {
  return !!(patient.insuranceCarrier && patient.insurancePolicyNumber);
}

/**
 * Get patient full name
 */
export function getPatientFullName(patient: EhrPatient): string {
  const parts = [patient.firstName];
  if (patient.middleName) parts.push(patient.middleName);
  parts.push(patient.lastName);
  if (patient.suffix) parts.push(patient.suffix);
  return parts.join(' ');
}

/**
 * Calculate patient age from date of birth
 */
export function calculatePatientAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

/**
 * Check if patient is deceased
 */
export function isPatientDeceased(patient: EhrPatient): boolean {
  return patient.status === 'deceased';
}

/**
 * Check if patient is active
 */
export function isPatientActive(patient: EhrPatient): boolean {
  return patient.status === 'active';
}

/**
 * Test Seed Data
 *
 * Predefined test datasets for E2E tests and integration testing.
 * Provides consistent, well-known test data across test suites.
 *
 * Usage:
 *   import { TEST_USERS, TEST_PATIENTS } from '@lazarus-life/shared/test/fixtures';
 */

import { TestDataFactory } from '../factories';
import type { User } from '../../schemas/user';
import type { EhrPatient } from '../../schemas/ehr/patient';
import type { EhrAppointment } from '../../schemas/ehr/appointment';

// ============================================================================
// Test Users (Well-Known Accounts)
// ============================================================================

/**
 * Predefined test users with fixed credentials for E2E testing
 * Password for all test users: "testpassword123"
 */
export const TEST_USERS: Record<string, User> = {
  admin: TestDataFactory.createAdmin({
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@test.com',
    username: 'admin',
    permissions: [
      'read:users',
      'write:users',
      'delete:users',
      'read:roles',
      'write:roles',
      'read:audit_logs',
      'read:organizations',
      'write:organizations',
    ],
  }),

  doctor: TestDataFactory.createProvider({
    id: '00000000-0000-0000-0000-000000000002',
    email: 'doctor@test.com',
    username: 'dr_smith',
    permissions: [
      'read:patients',
      'write:patients',
      'read:appointments',
      'write:appointments',
      'read:medical_records',
      'write:medical_records',
      'read:prescriptions',
      'write:prescriptions',
    ],
  }),

  nurse: TestDataFactory.createUser({
    id: '00000000-0000-0000-0000-000000000003',
    email: 'nurse@test.com',
    username: 'nurse_jones',
    role: 'nurse',
    permissions: [
      'read:patients',
      'read:appointments',
      'write:vitals',
      'read:medical_records',
    ],
  }),

  receptionist: TestDataFactory.createUser({
    id: '00000000-0000-0000-0000-000000000004',
    email: 'receptionist@test.com',
    username: 'receptionist_brown',
    role: 'receptionist',
    permissions: [
      'read:patients',
      'read:appointments',
      'write:appointments',
      'read:schedules',
    ],
  }),

  patient: TestDataFactory.createUser({
    id: '00000000-0000-0000-0000-000000000005',
    email: 'patient@test.com',
    username: 'patient_john',
    role: 'user',
    permissions: ['read:own_profile', 'read:own_appointments', 'read:own_records'],
  }),
};

// ============================================================================
// Test Patients (Well-Known Patient Records)
// ============================================================================

/**
 * Predefined test patients with realistic data
 */
export const TEST_PATIENTS: Record<string, EhrPatient> = {
  alice: TestDataFactory.createPatient({
    id: '00000000-0000-0000-0001-000000000001',
    ien: 1,
    organizationId: '00000000-0000-0000-0000-000000000100',
    firstName: 'Alice',
    lastName: 'Smith',
    dateOfBirth: '1985-03-15',
    gender: 'female',
    mrn: 'MRN-001',
    email: 'alice.smith@example.com',
    phoneMobile: '555-0101',
    addressLine1: '123 Main St',
    city: 'Boston',
    state: 'MA',
    zipCode: '02101',
    status: 'active',
  }),

  bob: TestDataFactory.createPatient({
    id: '00000000-0000-0000-0001-000000000002',
    ien: 2,
    organizationId: '00000000-0000-0000-0000-000000000100',
    firstName: 'Bob',
    lastName: 'Johnson',
    dateOfBirth: '1972-11-20',
    gender: 'male',
    mrn: 'MRN-002',
    email: 'bob.johnson@example.com',
    phoneMobile: '555-0102',
    addressLine1: '456 Oak Ave',
    city: 'Cambridge',
    state: 'MA',
    zipCode: '02139',
    status: 'active',
  }),

  carol: TestDataFactory.createPatient({
    id: '00000000-0000-0000-0001-000000000003',
    ien: 3,
    organizationId: '00000000-0000-0000-0000-000000000100',
    firstName: 'Carol',
    lastName: 'Williams',
    dateOfBirth: '1950-07-08',
    gender: 'female',
    mrn: 'MRN-003',
    email: 'carol.williams@example.com',
    phoneMobile: '555-0103',
    addressLine1: '789 Elm St',
    city: 'Somerville',
    state: 'MA',
    zipCode: '02144',
    status: 'active',
  }),

  david: TestDataFactory.createPatient({
    id: '00000000-0000-0000-0001-000000000004',
    ien: 4,
    organizationId: '00000000-0000-0000-0000-000000000100',
    firstName: 'David',
    lastName: 'Martinez',
    dateOfBirth: '2010-05-12',
    gender: 'male',
    mrn: 'MRN-004',
    phoneMobile: '555-0104',
    addressLine1: '321 Pine Rd',
    city: 'Brookline',
    state: 'MA',
    zipCode: '02445',
    status: 'active',
  }),

  emily: TestDataFactory.createPatient({
    id: '00000000-0000-0000-0001-000000000005',
    ien: 5,
    organizationId: '00000000-0000-0000-0000-000000000100',
    firstName: 'Emily',
    lastName: 'Davis',
    dateOfBirth: '1995-09-30',
    gender: 'female',
    mrn: 'MRN-005',
    email: 'emily.davis@example.com',
    phoneMobile: '555-0105',
    status: 'active',
  }),
};

// ============================================================================
// Test Appointments (Well-Known Appointment Records)
// ============================================================================

/**
 * Predefined test appointments
 */
export const TEST_APPOINTMENTS: Record<string, EhrAppointment> = {
  aliceFollowUp: TestDataFactory.createAppointment(TEST_PATIENTS.alice.id, {
    id: '00000000-0000-0000-0002-000000000001',
    ien: 1,
    organizationId: '00000000-0000-0000-0000-000000000100',
    providerId: TEST_USERS.doctor.id,
    providerName: 'Dr. Smith',
    appointmentType: 'follow_up',
    status: 'scheduled',
    reason: 'Follow-up for hypertension',
    durationMinutes: 30,
  }),

  bobAnnual: TestDataFactory.createAppointment(TEST_PATIENTS.bob.id, {
    id: '00000000-0000-0000-0002-000000000002',
    ien: 2,
    organizationId: '00000000-0000-0000-0000-000000000100',
    providerId: TEST_USERS.doctor.id,
    providerName: 'Dr. Smith',
    appointmentType: 'annual_exam',
    status: 'scheduled',
    reason: 'Annual physical examination',
    durationMinutes: 45,
  }),

  carolCompleted: TestDataFactory.createCompletedAppointment(TEST_PATIENTS.carol.id, {
    id: '00000000-0000-0000-0002-000000000003',
    ien: 3,
    organizationId: '00000000-0000-0000-0000-000000000100',
    providerId: TEST_USERS.doctor.id,
    providerName: 'Dr. Smith',
    appointmentType: 'follow_up',
    status: 'completed',
    reason: 'Diabetes management',
  }),
};

// ============================================================================
// Test Organizations
// ============================================================================

/**
 * Predefined test organization
 */
export const TEST_ORGANIZATION = {
  id: '00000000-0000-0000-0000-000000000100',
  name: 'Test Medical Center',
  code: 'TMC',
  status: 'active' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Complete Test Datasets
// ============================================================================

/**
 * Complete patient records with related data for integration tests
 */
export const COMPLETE_PATIENT_RECORDS = {
  alice: {
    patient: TEST_PATIENTS.alice,
    appointments: [TEST_APPOINTMENTS.aliceFollowUp],
    medications: [
      TestDataFactory.createMedication(TEST_PATIENTS.alice.id, {
        medicationName: 'Lisinopril 10mg',
        instructions: 'Take once daily with food',
      }),
    ],
    problems: [
      TestDataFactory.createProblem(TEST_PATIENTS.alice.id, {
        problemName: 'Essential Hypertension',
        onsetDate: '2020-01-15',
      }),
    ],
    vitals: [
      TestDataFactory.createVitalSigns(TEST_PATIENTS.alice.id, {
        bloodPressureSystolic: 128,
        bloodPressureDiastolic: 82,
        heartRate: 74,
      }),
    ],
  },

  bob: {
    patient: TEST_PATIENTS.bob,
    appointments: [TEST_APPOINTMENTS.bobAnnual],
    medications: [],
    problems: [],
    vitals: [
      TestDataFactory.createVitalSigns(TEST_PATIENTS.bob.id, {
        bloodPressureSystolic: 118,
        bloodPressureDiastolic: 76,
        heartRate: 68,
      }),
    ],
  },

  carol: {
    patient: TEST_PATIENTS.carol,
    appointments: [TEST_APPOINTMENTS.carolCompleted],
    medications: [
      TestDataFactory.createMedication(TEST_PATIENTS.carol.id, {
        medicationName: 'Metformin 500mg',
        instructions: 'Take twice daily with meals',
      }),
      TestDataFactory.createMedication(TEST_PATIENTS.carol.id, {
        medicationName: 'Atorvastatin 20mg',
        instructions: 'Take once daily at bedtime',
      }),
    ],
    problems: [
      TestDataFactory.createProblem(TEST_PATIENTS.carol.id, {
        problemName: 'Type 2 Diabetes Mellitus',
        onsetDate: '2015-06-20',
      }),
      TestDataFactory.createProblem(TEST_PATIENTS.carol.id, {
        problemName: 'Hyperlipidemia',
        onsetDate: '2018-03-10',
      }),
    ],
    vitals: [
      TestDataFactory.createVitalSigns(TEST_PATIENTS.carol.id, {
        bloodPressureSystolic: 135,
        bloodPressureDiastolic: 88,
        heartRate: 78,
        weight: 165,
        weightUnit: 'pounds',
      }),
    ],
  },
};

/**
 * Export all test data as a single object for convenience
 */
export const TEST_DATA = {
  users: TEST_USERS,
  patients: TEST_PATIENTS,
  appointments: TEST_APPOINTMENTS,
  organization: TEST_ORGANIZATION,
  complete: COMPLETE_PATIENT_RECORDS,
};

export default TEST_DATA;

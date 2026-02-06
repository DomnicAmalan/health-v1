/**
 * Test Data Factories
 *
 * Centralized test data generation with realistic defaults.
 * Provides factory functions for creating test entities with minimal boilerplate.
 *
 * Usage:
 *   const user = TestDataFactory.createUser({ email: 'custom@test.com' });
 *   const patient = TestDataFactory.createPatient({ firstName: 'Alice' });
 */

import type { User } from '../../schemas/user';
import type {
  EhrPatient,
  EhrGender,
  EhrPatientStatus,
} from '../../schemas/ehr/patient';
import type {
  EhrAppointment,
  EhrAppointmentStatus,
  EhrAppointmentType,
} from '../../schemas/ehr/appointment';
import type {
  EhrMedication,
  EhrMedicationStatus,
} from '../../schemas/ehr/medication';
import type { EhrProblem, EhrProblemStatus } from '../../schemas/ehr/problem';
import type { EhrVitalSigns } from '../../schemas/ehr/vital';

/**
 * Generate unique timestamp-based ID suffix
 */
function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate deterministic UUID for testing
 */
function testUuid(prefix = 'test'): string {
  const suffix = uniqueSuffix();
  return `${prefix}-0000-4000-8000-${suffix.padStart(12, '0').substring(0, 12)}`;
}

/**
 * Format date for EHR fields (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format datetime for EHR fields (ISO 8601)
 */
function formatDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * Test Data Factory - Main API
 */
export class TestDataFactory {
  // ============================================================================
  // User Factories
  // ============================================================================

  /**
   * Create test user with realistic defaults
   */
  static createUser(overrides?: Partial<User>): User {
    const suffix = uniqueSuffix();
    return {
      id: testUuid('user'),
      email: `test-user-${suffix}@example.com`,
      username: `testuser_${suffix}`,
      role: 'user',
      permissions: ['read:own_profile'],
      createdAt: formatDateTime(new Date()),
      ...overrides,
    };
  }

  /**
   * Create admin user
   */
  static createAdmin(overrides?: Partial<User>): User {
    return this.createUser({
      role: 'admin',
      permissions: [
        'read:users',
        'write:users',
        'delete:users',
        'read:roles',
        'write:roles',
        'read:audit_logs',
      ],
      ...overrides,
    });
  }

  /**
   * Create provider user
   */
  static createProvider(overrides?: Partial<User>): User {
    return this.createUser({
      role: 'provider',
      permissions: [
        'read:patients',
        'write:patients',
        'read:appointments',
        'write:appointments',
        'read:medical_records',
        'write:medical_records',
      ],
      ...overrides,
    });
  }

  // ============================================================================
  // Patient Factories
  // ============================================================================

  /**
   * Create test patient with realistic defaults
   */
  static createPatient(overrides?: Partial<EhrPatient>): EhrPatient {
    const suffix = uniqueSuffix();
    return {
      id: testUuid('patient'),
      ien: Math.floor(Math.random() * 1000000),
      organizationId: testUuid('org'),
      lastName: 'Doe',
      firstName: 'John',
      dateOfBirth: '1990-01-01',
      gender: 'male' as EhrGender,
      mrn: `MRN-${suffix.substring(0, 10).toUpperCase()}`,
      status: 'active' as EhrPatientStatus,
      createdAt: formatDateTime(new Date()),
      updatedAt: formatDateTime(new Date()),
      ...overrides,
    };
  }

  /**
   * Create female patient
   */
  static createFemalePatient(overrides?: Partial<EhrPatient>): EhrPatient {
    return this.createPatient({
      firstName: 'Jane',
      gender: 'female',
      ...overrides,
    });
  }

  /**
   * Create elderly patient (age 70+)
   */
  static createElderlyPatient(overrides?: Partial<EhrPatient>): EhrPatient {
    return this.createPatient({
      firstName: 'Robert',
      lastName: 'Senior',
      dateOfBirth: '1950-01-01',
      ...overrides,
    });
  }

  /**
   * Create pediatric patient (age < 18)
   */
  static createPediatricPatient(overrides?: Partial<EhrPatient>): EhrPatient {
    const birthYear = new Date().getFullYear() - 10;
    return this.createPatient({
      firstName: 'Emma',
      lastName: 'Young',
      dateOfBirth: `${birthYear}-06-15`,
      ...overrides,
    });
  }

  // ============================================================================
  // Appointment Factories
  // ============================================================================

  /**
   * Create test appointment
   */
  static createAppointment(
    patientId: string,
    overrides?: Partial<EhrAppointment>
  ): EhrAppointment {
    const scheduledDatetime = new Date(Date.now() + 86400000); // Tomorrow
    const durationMinutes = 30;
    const endDatetime = new Date(
      scheduledDatetime.getTime() + durationMinutes * 60000
    );

    return {
      id: testUuid('appt'),
      ien: Math.floor(Math.random() * 1000000),
      organizationId: testUuid('org'),
      patientId,
      appointmentType: 'follow_up' as EhrAppointmentType,
      status: 'scheduled' as EhrAppointmentStatus,
      scheduledDatetime: formatDateTime(scheduledDatetime),
      durationMinutes,
      scheduledEndDatetime: formatDateTime(endDatetime),
      reminderSent: false,
      createdAt: formatDateTime(new Date()),
      updatedAt: formatDateTime(new Date()),
      ...overrides,
    };
  }

  /**
   * Create urgent appointment (today)
   */
  static createUrgentAppointment(
    patientId: string,
    overrides?: Partial<EhrAppointment>
  ): EhrAppointment {
    const scheduledDatetime = new Date(Date.now() + 3600000); // 1 hour from now
    return this.createAppointment(patientId, {
      appointmentType: 'urgent',
      scheduledDatetime: formatDateTime(scheduledDatetime),
      durationMinutes: 15,
      reason: 'Urgent care needed',
      ...overrides,
    });
  }

  /**
   * Create completed appointment (past)
   */
  static createCompletedAppointment(
    patientId: string,
    overrides?: Partial<EhrAppointment>
  ): EhrAppointment {
    const scheduledDatetime = new Date(Date.now() - 86400000); // Yesterday
    const checkInTime = new Date(scheduledDatetime.getTime() - 600000); // 10 min before
    const checkoutTime = new Date(scheduledDatetime.getTime() + 1800000); // 30 min after

    return this.createAppointment(patientId, {
      status: 'completed',
      scheduledDatetime: formatDateTime(scheduledDatetime),
      checkInTime: formatDateTime(checkInTime),
      checkoutTime: formatDateTime(checkoutTime),
      ...overrides,
    });
  }

  // ============================================================================
  // Medication Factories
  // ============================================================================

  /**
   * Create test medication
   */
  static createMedication(
    patientId: string,
    overrides?: Partial<EhrMedication>
  ): EhrMedication {
    return {
      id: testUuid('med'),
      ien: Math.floor(Math.random() * 1000000),
      organizationId: testUuid('org'),
      patientId,
      medicationName: 'Lisinopril 10mg',
      status: 'active' as EhrMedicationStatus,
      startDate: formatDate(new Date()),
      instructions: 'Take once daily',
      createdAt: formatDateTime(new Date()),
      updatedAt: formatDateTime(new Date()),
      ...overrides,
    };
  }

  // ============================================================================
  // Problem List Factories
  // ============================================================================

  /**
   * Create test problem
   */
  static createProblem(
    patientId: string,
    overrides?: Partial<EhrProblem>
  ): EhrProblem {
    return {
      id: testUuid('problem'),
      ien: Math.floor(Math.random() * 1000000),
      organizationId: testUuid('org'),
      patientId,
      problemName: 'Hypertension',
      status: 'active' as EhrProblemStatus,
      onsetDate: formatDate(new Date(Date.now() - 31536000000)), // 1 year ago
      createdAt: formatDateTime(new Date()),
      updatedAt: formatDateTime(new Date()),
      ...overrides,
    };
  }

  // ============================================================================
  // Vital Signs Factories
  // ============================================================================

  /**
   * Create test vital signs
   */
  static createVitalSigns(
    patientId: string,
    overrides?: Partial<EhrVitalSigns>
  ): EhrVitalSigns {
    return {
      id: testUuid('vitals'),
      ien: Math.floor(Math.random() * 1000000),
      organizationId: testUuid('org'),
      patientId,
      recordedDatetime: formatDateTime(new Date()),
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRate: 72,
      temperature: 98.6,
      temperatureUnit: 'fahrenheit',
      respiratoryRate: 16,
      oxygenSaturation: 98,
      createdAt: formatDateTime(new Date()),
      updatedAt: formatDateTime(new Date()),
      ...overrides,
    };
  }

  // ============================================================================
  // Batch Factories
  // ============================================================================

  /**
   * Create multiple patients at once
   */
  static createPatients(count: number, overrides?: Partial<EhrPatient>): EhrPatient[] {
    return Array.from({ length: count }, (_, i) =>
      this.createPatient({
        firstName: `Patient${i + 1}`,
        mrn: `MRN-${String(i + 1).padStart(6, '0')}`,
        ...overrides,
      })
    );
  }

  /**
   * Create complete patient record with related data
   */
  static createPatientWithRecords(overrides?: Partial<EhrPatient>): {
    patient: EhrPatient;
    appointments: EhrAppointment[];
    medications: EhrMedication[];
    problems: EhrProblem[];
    vitals: EhrVitalSigns[];
  } {
    const patient = this.createPatient(overrides);

    return {
      patient,
      appointments: [
        this.createAppointment(patient.id),
        this.createCompletedAppointment(patient.id),
      ],
      medications: [
        this.createMedication(patient.id, { medicationName: 'Lisinopril 10mg' }),
        this.createMedication(patient.id, { medicationName: 'Metformin 500mg' }),
      ],
      problems: [
        this.createProblem(patient.id, { problemName: 'Hypertension' }),
        this.createProblem(patient.id, { problemName: 'Type 2 Diabetes' }),
      ],
      vitals: [this.createVitalSigns(patient.id)],
    };
  }
}

/**
 * Re-export for convenience
 */
export default TestDataFactory;

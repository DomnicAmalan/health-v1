/**
 * Prescription/Dispensing types
 * Corresponds to VistA Outpatient Pharmacy (^PSO File #52)
 */

/** Prescription status */
export type PrescriptionStatus =
  | "active"
  | "discontinued"
  | "expired"
  | "on_hold";

/** Dispensing workflow status */
export type DispensingStatus =
  | "pending"      // New prescription, awaiting pharmacist verification
  | "verified"     // Pharmacist has verified, ready for dispensing
  | "dispensed"    // Drug has been dispensed
  | "ready_for_pickup"  // Ready for patient pickup
  | "completed";   // Patient has picked up

/** Prescription response from YottaDB API */
export interface Prescription {
  ien: number;
  patientIen: number;
  rxNumber: string;
  drugName: string;
  drugCode?: string;
  dose: string;
  route: string;
  frequency: string;
  sig: string;
  quantity: number;
  daysSupply: number;
  refillsAllowed: number;
  refillsRemaining: number;
  prescriberIen?: number;
  pharmacyLocation?: string;
  orderDate: string;
  fillDate?: string;
  expirationDate?: string;
  status: PrescriptionStatus;
  dispensingStatus: DispensingStatus;
  verifiedBy?: number;
  dispensedBy?: number;
}

/** Prescriptions list response */
export interface PrescriptionsResponse {
  prescriptions: Prescription[];
}

/** Create prescription request */
export interface CreatePrescriptionRequest {
  patientIen: number;
  drugName: string;
  drugCode?: string;
  dose: string;
  route: string;
  frequency: string;
  sig: string;
  quantity: number;
  daysSupply: number;
  refillsAllowed?: number;
  prescriberIen?: number;
  pharmacyLocation?: string;
}

/** Verify prescription request */
export interface VerifyPrescriptionRequest {
  verifiedBy: number;
}

/** Dispense prescription request */
export interface DispensePrescriptionRequest {
  dispensedBy: number;
  lotNumber?: string;
  expirationDate?: string;
}

/** Refill prescription request */
export interface RefillPrescriptionRequest {
  dispensedBy: number;
  quantity?: number;
}

/** Prescription action response */
export interface PrescriptionActionResponse {
  success: boolean;
  ien: number;
}

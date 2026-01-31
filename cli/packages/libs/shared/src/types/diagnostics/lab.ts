/**
 * Laboratory Types
 * Types for Lab Information System (LIS)
 */

// Priority
export type Priority = "routine" | "urgent" | "stat";

// Test categories
export type TestCategory =
  | "hematology"
  | "biochemistry"
  | "microbiology"
  | "immunology"
  | "serology"
  | "urinalysis"
  | "coagulation"
  | "blood_bank"
  | "cytology"
  | "histopathology"
  | "molecular"
  | "toxicology"
  | "endocrinology"
  | "other";

// Sample types
export type SampleType =
  | "blood"
  | "serum"
  | "plasma"
  | "urine"
  | "stool"
  | "sputum"
  | "csf"
  | "tissue"
  | "swab"
  | "fluid"
  | "other";

// Sample status
export type SampleStatus =
  | "pending_collection"
  | "collected"
  | "received"
  | "processing"
  | "analyzed"
  | "verified"
  | "rejected"
  | "cancelled";

// Result status
export type ResultStatus =
  | "pending"
  | "preliminary"
  | "final"
  | "corrected"
  | "cancelled";

// Result flag
export type ResultFlag =
  | "normal"
  | "low"
  | "high"
  | "critical_low"
  | "critical_high"
  | "abnormal"
  | "positive"
  | "negative";

// Reference range type
export type ReferenceRangeType = "numeric" | "text" | "coded";

/**
 * Lab Test Definition (from test catalog)
 */
export interface LabTest {
  id: string;
  testCode: string;
  testName: string;
  shortName?: string;
  loincCode?: string;
  cptCode?: string;
  category: TestCategory;
  sampleType: SampleType;
  sampleVolume?: number;
  sampleVolumeUnit?: string;
  containerType?: string;
  specialInstructions?: string;
  turnaroundTime?: number; // in hours
  unit?: string; // Unit of measurement for test results (e.g., "mg/dL", "cells/uL")
  price?: number;
  currencyCode?: string;
  isActive: boolean;
  requiresFasting?: boolean;
  departmentId?: string;
  departmentName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Test Panel (group of tests)
 */
export interface TestPanel {
  id: string;
  panelCode: string;
  panelName: string;
  description?: string;
  tests: LabTest[];
  testIds?: string[]; // Convenience property - array of test IDs
  price?: number;
  currencyCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Reference Range
 */
export interface ReferenceRange {
  id: string;
  testId: string;
  rangeType: ReferenceRangeType;
  gender?: "male" | "female" | "all";
  ageFrom?: number;
  ageTo?: number;
  ageUnit?: "days" | "months" | "years";
  lowValue?: number;
  highValue?: number;
  criticalLow?: number;
  criticalHigh?: number;
  unit?: string;
  textValue?: string;
  normalValues?: string[]; // for coded results
  isDefault: boolean;
}

/**
 * Lab Order
 */
export interface LabOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientMRN?: string;
  encounterId?: string;
  orderingDoctorId: string;
  orderingDoctorName: string;
  orderDate: string;
  priority: "routine" | "urgent" | "stat";
  status: "ordered" | "collected" | "received" | "in_progress" | "completed" | "cancelled";
  clinicalNotes?: string;
  diagnosis?: string;
  tests: LabOrderTest[];
  totalAmount?: number;
  currencyCode?: string;
  isPaid: boolean;
  collectionDate?: string;
  collectedBy?: string;
  receivedDate?: string;
  receivedBy?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lab Order Test (individual test within an order)
 */
export interface LabOrderTest {
  id: string;
  orderId: string;
  testId: string;
  testCode: string;
  testName: string;
  status: SampleStatus;
  sampleId?: string;
  price?: number;
  currencyCode?: string;
  resultId?: string;
}

/**
 * Sample
 */
export interface Sample {
  id: string;
  sampleNumber: string;
  orderId: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  sampleType: SampleType;
  containerType?: string;
  collectionDate?: string;
  collectedAt?: string; // Timestamp when collected
  collectedBy?: string;
  collectionLocation?: string;
  receivedDate?: string;
  receivedAt?: string; // Timestamp when received
  receivedBy?: string;
  priority?: "routine" | "urgent" | "stat"; // Sample priority
  status: SampleStatus;
  rejectionReason?: string;
  storageLocation?: string;
  tests: SampleTest[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sample Test (test associated with a sample)
 */
export interface SampleTest {
  id: string;
  sampleId: string;
  testId: string;
  testCode: string;
  testName: string;
  status: SampleStatus;
  resultId?: string;
}

/**
 * Lab Result
 */
export interface LabResult {
  id: string;
  resultNumber: string;
  orderId: string;
  orderNumber: string;
  sampleId: string;
  sampleNumber: string;
  testId: string;
  testCode: string;
  testName: string;
  patientId: string;
  patientName: string;
  resultDate: string;
  status: ResultStatus;
  value?: string;
  numericValue?: number;
  unit?: string;
  referenceRange?: string;
  flag?: ResultFlag;
  isCritical: boolean;
  criticalNotified?: boolean;
  criticalNotifiedTo?: string;
  criticalNotifiedAt?: string;
  performedBy?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  isVerified: boolean; // Whether result has been verified
  enteredBy?: string; // User who entered the result
  category?: string; // Test category
  comments?: string;
  methodology?: string;
  instrumentId?: string;
  instrumentName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lab Result Component (for tests with multiple components)
 */
export interface LabResultComponent {
  id: string;
  resultId: string;
  componentCode: string;
  componentName: string;
  value?: string;
  numericValue?: number;
  unit?: string;
  referenceRange?: string;
  flag?: ResultFlag;
  isCritical: boolean;
  sequence: number;
}

/**
 * Lab Report (complete report for an order)
 */
export interface LabReport {
  id: string;
  reportNumber: string;
  orderId: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  orderingDoctorName: string;
  orderingDoctorId?: string; // Doctor ID who ordered
  collectedAt?: string; // When sample was collected
  reportDate: string;
  status: "draft" | "final" | "amended";
  results: LabResult[];
  summary?: string;
  interpretation?: string;
  comments?: string; // Additional comments
  signedBy?: string;
  signedAt?: string;
  printedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface LabTestListResponse {
  tests: LabTest[];
  total: number;
  page: number;
  limit: number;
}

export interface TestPanelListResponse {
  panels: TestPanel[];
  total: number;
  page: number;
  limit: number;
}

export interface LabOrderListResponse {
  orders: LabOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface SampleListResponse {
  samples: Sample[];
  total: number;
  page: number;
  limit: number;
}

export interface LabResultListResponse {
  results: LabResult[];
  total: number;
  page: number;
  limit: number;
}

// Request types
export interface CreateLabOrderRequest {
  patientId: string;
  encounterId?: string;
  orderingDoctorId: string;
  priority: "routine" | "urgent" | "stat";
  clinicalNotes?: string;
  diagnosis?: string;
  testIds: string[];
}

export interface CollectSampleRequest {
  orderId: string;
  sampleType: SampleType;
  containerType?: string;
  collectionLocation?: string;
  testIds: string[];
  notes?: string;
}

export interface ReceiveSampleRequest {
  sampleId: string;
  storageLocation?: string;
  notes?: string;
}

export interface RejectSampleRequest {
  sampleId: string;
  rejectionReason: string;
}

export interface EnterResultRequest {
  sampleId: string;
  testId: string;
  value?: string;
  numericValue?: number;
  unit?: string;
  flag?: ResultFlag;
  comments?: string;
  methodology?: string;
  instrumentId?: string;
  components?: {
    componentCode: string;
    value?: string;
    numericValue?: number;
    unit?: string;
    flag?: ResultFlag;
  }[];
}

export interface VerifyResultRequest {
  resultId: string;
  comments?: string;
}

export interface NotifyCriticalRequest {
  resultId: string;
  notifiedTo: string;
  notificationMethod: "phone" | "page" | "email" | "in_person";
  notes?: string;
}

// Dashboard stats
export interface LabDashboardStats {
  pendingOrders: number;
  pendingCollection: number;
  pendingResults: number;
  criticalResults: number;
  completedToday: number;
  averageTAT: number; // in hours
  byCategory: {
    category: TestCategory;
    count: number;
  }[];
  byStatus: {
    status: string;
    count: number;
  }[];

  // Additional convenience properties
  pendingVerification: number; // Results awaiting verification
  testsCompletedToday: number; // Alias for completedToday
  samplesInLab: number; // Samples currently in the lab
}

// Worklist types
export interface LabWorklist {
  type: "collection" | "processing" | "verification";
  items: LabWorklistItem[];
  total: number;
}

export interface LabWorklistItem {
  id: string;
  orderNumber: string;
  patientName: string;
  patientMRN?: string;
  testName: string;
  priority: "routine" | "urgent" | "stat";
  orderedAt: string;
  dueAt?: string;
  status: string;
  assignedTo?: string;
}

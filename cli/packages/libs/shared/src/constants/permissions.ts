/**
 * Permission Constants
 * All permissions used throughout the application
 */

export const PERMISSIONS = {
  // Patient permissions
  PATIENTS: {
    VIEW: "patients:view",
    CREATE: "patients:create",
    UPDATE: "patients:update",
    DELETE: "patients:delete",
    VIEW_SSN: "patients:view:ssn",
    VIEW_FULL: "patients:view:full",
  },

  // User permissions
  USERS: {
    VIEW: "users:view",
    CREATE: "users:create",
    UPDATE: "users:update",
    DELETE: "users:delete",
  },

  // Clinical permissions
  CLINICAL: {
    VIEW: "clinical:view",
    CREATE: "clinical:create",
    UPDATE: "clinical:update",
    DELETE: "clinical:delete",
  },

  // Orders permissions
  ORDERS: {
    VIEW: "orders:view",
    CREATE: "orders:create",
    UPDATE: "orders:update",
    DELETE: "orders:delete",
  },

  // Results permissions
  RESULTS: {
    VIEW: "results:view",
    CREATE: "results:create",
    UPDATE: "results:update",
    DELETE: "results:delete",
  },

  // Pharmacy permissions
  PHARMACY: {
    VIEW: "pharmacy:view",
    CREATE: "pharmacy:create",
    UPDATE: "pharmacy:update",
    DELETE: "pharmacy:delete",
  },

  // Scheduling permissions
  SCHEDULING: {
    VIEW: "scheduling:view",
    CREATE: "scheduling:create",
    UPDATE: "scheduling:update",
    DELETE: "scheduling:delete",
  },

  // Revenue permissions
  REVENUE: {
    VIEW: "revenue:view",
    CREATE: "revenue:create",
    UPDATE: "revenue:update",
    DELETE: "revenue:delete",
  },

  // Billing permissions
  BILLING: {
    VIEW: "billing:view",
    CREATE: "billing:create",
    UPDATE: "billing:update",
    DELETE: "billing:delete",
    PROCESS_PAYMENT: "billing:process_payment",
    MANAGE_INVOICES: "billing:manage_invoices",
  },

  // Insurance permissions
  INSURANCE: {
    VIEW: "insurance:view",
    CREATE: "insurance:create",
    UPDATE: "insurance:update",
    DELETE: "insurance:delete",
    MANAGE_CLAIMS: "insurance:manage_claims",
    MANAGE_PREAUTH: "insurance:manage_preauth",
  },

  // Analytics permissions
  ANALYTICS: {
    VIEW: "analytics:view",
    EXPORT: "analytics:export",
  },

  // Settings permissions
  SETTINGS: {
    VIEW: "settings:view",
    UPDATE: "settings:update",
  },

  // Department permissions
  DEPARTMENTS: {
    // OPD
    OPD_VIEW: "departments:opd:view",
    OPD_MANAGE: "departments:opd:manage",
    OPD_QUEUE: "departments:opd:queue",
    // IPD
    IPD_VIEW: "departments:ipd:view",
    IPD_ADMIT: "departments:ipd:admit",
    IPD_DISCHARGE: "departments:ipd:discharge",
    IPD_TRANSFER: "departments:ipd:transfer",
    // Beds
    BEDS_VIEW: "departments:beds:view",
    BEDS_MANAGE: "departments:beds:manage",
    BEDS_ALLOCATE: "departments:beds:allocate",
    // Wards
    WARDS_VIEW: "departments:wards:view",
    WARDS_MANAGE: "departments:wards:manage",
    // OT
    OT_VIEW: "departments:ot:view",
    OT_SCHEDULE: "departments:ot:schedule",
    OT_MANAGE: "departments:ot:manage",
  },

  // Diagnostics - Laboratory Information System (LIS)
  LAB: {
    VIEW: "lab:view",
    ORDER: "lab:order",
    COLLECT: "lab:collect",
    PROCESS: "lab:process",
    RESULT_ENTRY: "lab:result:entry",
    RESULT_VERIFY: "lab:result:verify",
    RESULT_AMEND: "lab:result:amend",
    REPORT_SIGN: "lab:report:sign",
    MANAGE_TESTS: "lab:manage:tests",
    MANAGE_PANELS: "lab:manage:panels",
    CRITICAL_NOTIFY: "lab:critical:notify",
  },

  // Diagnostics - Radiology Information System (RIS)
  RADIOLOGY: {
    VIEW: "radiology:view",
    ORDER: "radiology:order",
    SCHEDULE: "radiology:schedule",
    PERFORM: "radiology:perform",
    REPORT_CREATE: "radiology:report:create",
    REPORT_SIGN: "radiology:report:sign",
    REPORT_ADDENDUM: "radiology:report:addendum",
    MANAGE_EXAMS: "radiology:manage:exams",
    MANAGE_ROOMS: "radiology:manage:rooms",
    CRITICAL_NOTIFY: "radiology:critical:notify",
  },

  // Workflow permissions
  WORKFLOWS: {
    VIEW: "workflows:view",
    CREATE: "workflows:create",
    UPDATE: "workflows:update",
    DELETE: "workflows:delete",
  },

  // Compliance permissions
  COMPLIANCE: {
    VIEW: "compliance:view",
    CREATE: "compliance:create",
    UPDATE: "compliance:update",
    DELETE: "compliance:delete",
    ASSESS: "compliance:assess",
    REMEDIATE: "compliance:remediate",
  },

  // Training permissions
  TRAINING: {
    VIEW: "training:view",
    ENROLL: "training:enroll",
    COMPLETE: "training:complete",
    MANAGE: "training:manage",
    ASSIGN: "training:assign",
  },
} as const;

export type Permission =
  | (typeof PERMISSIONS.PATIENTS)[keyof typeof PERMISSIONS.PATIENTS]
  | (typeof PERMISSIONS.USERS)[keyof typeof PERMISSIONS.USERS]
  | (typeof PERMISSIONS.CLINICAL)[keyof typeof PERMISSIONS.CLINICAL]
  | (typeof PERMISSIONS.ORDERS)[keyof typeof PERMISSIONS.ORDERS]
  | (typeof PERMISSIONS.RESULTS)[keyof typeof PERMISSIONS.RESULTS]
  | (typeof PERMISSIONS.PHARMACY)[keyof typeof PERMISSIONS.PHARMACY]
  | (typeof PERMISSIONS.SCHEDULING)[keyof typeof PERMISSIONS.SCHEDULING]
  | (typeof PERMISSIONS.REVENUE)[keyof typeof PERMISSIONS.REVENUE]
  | (typeof PERMISSIONS.BILLING)[keyof typeof PERMISSIONS.BILLING]
  | (typeof PERMISSIONS.INSURANCE)[keyof typeof PERMISSIONS.INSURANCE]
  | (typeof PERMISSIONS.ANALYTICS)[keyof typeof PERMISSIONS.ANALYTICS]
  | (typeof PERMISSIONS.SETTINGS)[keyof typeof PERMISSIONS.SETTINGS]
  | (typeof PERMISSIONS.DEPARTMENTS)[keyof typeof PERMISSIONS.DEPARTMENTS]
  | (typeof PERMISSIONS.LAB)[keyof typeof PERMISSIONS.LAB]
  | (typeof PERMISSIONS.RADIOLOGY)[keyof typeof PERMISSIONS.RADIOLOGY]
  | (typeof PERMISSIONS.WORKFLOWS)[keyof typeof PERMISSIONS.WORKFLOWS]
  | (typeof PERMISSIONS.COMPLIANCE)[keyof typeof PERMISSIONS.COMPLIANCE]
  | (typeof PERMISSIONS.TRAINING)[keyof typeof PERMISSIONS.TRAINING];

// Role-based permission mappings
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.values(PERMISSIONS).flatMap((category) => Object.values(category)),
  doctor: [
    PERMISSIONS.PATIENTS.VIEW,
    PERMISSIONS.PATIENTS.VIEW_FULL,
    PERMISSIONS.CLINICAL.VIEW,
    PERMISSIONS.CLINICAL.CREATE,
    PERMISSIONS.CLINICAL.UPDATE,
    PERMISSIONS.ORDERS.VIEW,
    PERMISSIONS.ORDERS.CREATE,
    PERMISSIONS.RESULTS.VIEW,
    PERMISSIONS.SCHEDULING.VIEW,
    PERMISSIONS.LAB.VIEW,
    PERMISSIONS.LAB.ORDER,
    PERMISSIONS.RADIOLOGY.VIEW,
    PERMISSIONS.RADIOLOGY.ORDER,
  ],
  nurse: [
    PERMISSIONS.PATIENTS.VIEW,
    PERMISSIONS.CLINICAL.VIEW,
    PERMISSIONS.CLINICAL.UPDATE,
    PERMISSIONS.ORDERS.VIEW,
    PERMISSIONS.RESULTS.VIEW,
    PERMISSIONS.SCHEDULING.VIEW,
    PERMISSIONS.LAB.VIEW,
    PERMISSIONS.LAB.COLLECT,
    PERMISSIONS.RADIOLOGY.VIEW,
  ],
  receptionist: [
    PERMISSIONS.PATIENTS.VIEW,
    PERMISSIONS.PATIENTS.CREATE,
    PERMISSIONS.SCHEDULING.VIEW,
    PERMISSIONS.SCHEDULING.CREATE,
    PERMISSIONS.SCHEDULING.UPDATE,
  ],
  // Lab technician - sample collection and processing
  lab_technician: [
    PERMISSIONS.PATIENTS.VIEW,
    PERMISSIONS.LAB.VIEW,
    PERMISSIONS.LAB.COLLECT,
    PERMISSIONS.LAB.PROCESS,
    PERMISSIONS.LAB.RESULT_ENTRY,
  ],
  // Lab supervisor - can verify results and manage tests
  lab_supervisor: [
    PERMISSIONS.PATIENTS.VIEW,
    PERMISSIONS.LAB.VIEW,
    PERMISSIONS.LAB.COLLECT,
    PERMISSIONS.LAB.PROCESS,
    PERMISSIONS.LAB.RESULT_ENTRY,
    PERMISSIONS.LAB.RESULT_VERIFY,
    PERMISSIONS.LAB.RESULT_AMEND,
    PERMISSIONS.LAB.MANAGE_TESTS,
    PERMISSIONS.LAB.MANAGE_PANELS,
    PERMISSIONS.LAB.CRITICAL_NOTIFY,
  ],
  // Pathologist - can sign reports
  pathologist: [
    PERMISSIONS.PATIENTS.VIEW,
    PERMISSIONS.LAB.VIEW,
    PERMISSIONS.LAB.RESULT_VERIFY,
    PERMISSIONS.LAB.RESULT_AMEND,
    PERMISSIONS.LAB.REPORT_SIGN,
    PERMISSIONS.LAB.CRITICAL_NOTIFY,
  ],
  // Radiology technician - performs exams
  radiology_technician: [
    PERMISSIONS.PATIENTS.VIEW,
    PERMISSIONS.RADIOLOGY.VIEW,
    PERMISSIONS.RADIOLOGY.SCHEDULE,
    PERMISSIONS.RADIOLOGY.PERFORM,
  ],
  // Radiologist - reads and reports
  radiologist: [
    PERMISSIONS.PATIENTS.VIEW,
    PERMISSIONS.RADIOLOGY.VIEW,
    PERMISSIONS.RADIOLOGY.REPORT_CREATE,
    PERMISSIONS.RADIOLOGY.REPORT_SIGN,
    PERMISSIONS.RADIOLOGY.REPORT_ADDENDUM,
    PERMISSIONS.RADIOLOGY.CRITICAL_NOTIFY,
  ],
  // Radiology supervisor
  radiology_supervisor: [
    PERMISSIONS.PATIENTS.VIEW,
    PERMISSIONS.RADIOLOGY.VIEW,
    PERMISSIONS.RADIOLOGY.SCHEDULE,
    PERMISSIONS.RADIOLOGY.PERFORM,
    PERMISSIONS.RADIOLOGY.REPORT_CREATE,
    PERMISSIONS.RADIOLOGY.REPORT_SIGN,
    PERMISSIONS.RADIOLOGY.REPORT_ADDENDUM,
    PERMISSIONS.RADIOLOGY.MANAGE_EXAMS,
    PERMISSIONS.RADIOLOGY.MANAGE_ROOMS,
    PERMISSIONS.RADIOLOGY.CRITICAL_NOTIFY,
  ],
};

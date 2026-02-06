/**
 * Unified API Routes
 * Centralized constants for all API endpoints across admin and client-app
 *
 * All routes use /v1/ prefix for API versioning.
 * The /api prefix is automatically added by getApiUrl() function.
 * Health check and auth routes are excluded from /api prefix.
 */

export const API_ROUTES = {
  // Health check (unversioned, no /api prefix)
  HEALTH: "/health",

  // Authentication (versioned, no /api prefix)
  AUTH: {
    LOGIN: "/v1/auth/login",
    LOGOUT: "/v1/auth/logout",
    REFRESH: "/v1/auth/token",
    USERINFO: "/v1/auth/userinfo",
  },

  // Setup (versioned, gets /api prefix)
  SETUP: {
    INITIALIZE: "/v1/setup/initialize",
    STATUS: "/v1/setup/status",
  },

  // Users (versioned, gets /api prefix)
  USERS: {
    LIST: "/v1/users",
    GET: (id: string) => `/v1/users/${id}`,
    CREATE: "/v1/users",
    UPDATE: (id: string) => `/v1/users/${id}`,
    DELETE: (id: string) => `/v1/users/${id}`,
  },

  // Organizations (versioned, gets /api prefix)
  ORGANIZATIONS: {
    LIST: "/v1/organizations",
    GET: (id: string) => `/v1/organizations/${id}`,
    CREATE: "/v1/organizations",
    UPDATE: (id: string) => `/v1/organizations/${id}`,
    DELETE: (id: string) => `/v1/organizations/${id}`,
  },

  // Permissions (versioned, gets /api prefix)
  PERMISSIONS: {
    LIST: "/v1/permissions",
    GET: (id: string) => `/v1/permissions/${id}`,
    CREATE: "/v1/permissions",
    UPDATE: (id: string) => `/v1/permissions/${id}`,
    DELETE: (id: string) => `/v1/permissions/${id}`,
  },

  // Services (versioned, gets /api prefix)
  SERVICES: {
    LIST: "/v1/services",
    GET: (id: string) => `/v1/services/${id}`,
    CREATE: "/v1/services",
    UPDATE: (id: string) => `/v1/services/${id}`,
    DELETE: (id: string) => `/v1/services/${id}`,
    STATUS: "/v1/services/status",
  },

  // Patients (versioned, gets /api prefix)
  PATIENTS: {
    LIST: "/v1/patients",
    GET: (id: string) => `/v1/patients/${id}`,
    CREATE: "/v1/patients",
    UPDATE: (id: string) => `/v1/patients/${id}`,
    DELETE: (id: string) => `/v1/patients/${id}`,
  },

  // Admin - Permissions (versioned, gets /api prefix)
  ADMIN: {
    PERMISSIONS: {
      CHECK: "/v1/admin/permissions/check",
      CHECK_BATCH: "/v1/admin/permissions/check-batch",
      USER: (id: string) => `/v1/admin/permissions/user/${id}`,
      USER_PAGES: (id: string) => `/v1/admin/permissions/user/${id}/pages`,
      USER_BUTTONS: (id: string, page: string) =>
        `/v1/admin/permissions/user/${id}/buttons/${page}`,
      USER_FIELDS: (id: string, page: string) => `/v1/admin/permissions/user/${id}/fields/${page}`,
      ASSIGN: "/v1/admin/permissions/assign",
      ASSIGN_BATCH: "/v1/admin/permissions/assign-batch",
      REVOKE: "/v1/admin/permissions/revoke",
    },
    UI: {
      PAGES: "/v1/admin/ui/pages",
      PAGES_BUTTONS: (id: string) => `/v1/admin/ui/pages/${id}/buttons`,
      PAGES_FIELDS: (id: string) => `/v1/admin/ui/pages/${id}/fields`,
      BUTTONS: "/v1/admin/ui/buttons",
      FIELDS: "/v1/admin/ui/fields",
      APIS: "/v1/admin/ui/apis",
    },
    GROUPS: {
      LIST: "/v1/admin/groups",
      GET: (id: string) => `/v1/admin/groups/${id}`,
      CREATE: "/v1/admin/groups",
      UPDATE: (id: string) => `/v1/admin/groups/${id}`,
      DELETE: (id: string) => `/v1/admin/groups/${id}`,
      ADD_USER: (groupId: string, userId: string) => `/v1/admin/groups/${groupId}/users/${userId}`,
      REMOVE_USER: (groupId: string, userId: string) =>
        `/v1/admin/groups/${groupId}/users/${userId}`,
      ASSIGN_ROLE: (groupId: string, roleId: string) =>
        `/v1/admin/groups/${groupId}/roles/${roleId}`,
    },
    DASHBOARD: {
      STATS: "/v1/admin/dashboard/stats",
    },
    ROLES: {
      LIST: "/v1/admin/roles",
      GET: (id: string) => `/v1/admin/roles/${id}`,
      CREATE: "/v1/admin/roles",
      UPDATE: (id: string) => `/v1/admin/roles/${id}`,
      DELETE: (id: string) => `/v1/admin/roles/${id}`,
      ASSIGN: "/v1/admin/roles/assign",
    },
    RELATIONSHIPS: {
      LIST: "/v1/admin/relationships",
      CHECK: "/v1/relationships/check",
      BATCH_CHECK: "/v1/relationships/batch-check",
      USER: (userId: string) => `/v1/relationships/user/${userId}`,
      CREATE: "/v1/relationships",
      DELETE: (id: string) => `/v1/relationships/${id}`,
    },
    ENCRYPTION: {
      DEK_STATUS: (userId: string) => `/v1/admin/encryption/deks/${userId}/status`,
      DEKS: "/v1/admin/encryption/deks",
      DEK_ROTATE: "/v1/admin/encryption/deks/rotate",
      MASTER_KEY_STATUS: "/v1/admin/encryption/master-key/status",
      MASTER_KEY_ROTATE: "/v1/admin/encryption/master-key/rotate",
      STATS: "/v1/admin/encryption/stats",
    },
  },

  // Vault proxy routes (backend-mediated vault access)
  VAULT: {
    /** Request an on-demand vault token (POST) */
    TOKEN: "/v1/vault/token",
    /** List secrets at a path (GET) */
    SECRETS_LIST: "/v1/vault/secrets",
    /** Read/Write/Delete a secret (GET/POST/DELETE) */
    SECRET: (path: string) => `/v1/vault/secrets/${path}`,
    /** Check capabilities for paths (POST) */
    CAPABILITIES: "/v1/vault/capabilities",
  },

  // ============================================================================
  // Direct Vault API Routes (for rustyvault-ui)
  // These are direct Vault API endpoints, not backend-mediated
  // Base URL for vault is /v1, so routes here are relative to /v1
  // ============================================================================
  VAULT_DIRECT: {
    // System routes
    SYS: {
      HEALTH: "/sys/health",
      SEAL_STATUS: "/sys/seal-status",
      SEAL: "/sys/seal",
      UNSEAL: "/sys/unseal",
      INIT: "/sys/init",
      KEYS_DOWNLOAD: "/sys/init/keys.txt",
      KEYS_AUTH: "/sys/init/keys",
      MOUNTS: "/sys/mounts",
      MOUNT: (path: string) => `/sys/mounts/${path}`,
      AUTH: "/sys/auth",
      AUTH_METHOD: (path: string) => `/sys/auth/${path}`,
    },

    // Auth routes
    AUTH: {
      USERPASS_LOGIN: (username: string) => `/auth/userpass/login/${username}`,
      USERPASS_USERS: "/auth/userpass/users",
      USERPASS_USER: (username: string) => `/auth/userpass/users/${username}`,
      APPROLE_LOGIN: "/auth/approle/login",
      TOKEN_CREATE: "/auth/token/create",
      TOKEN_LOOKUP: "/auth/token/lookup",
      TOKEN_LOOKUP_SELF: "/auth/token/lookup-self",
      TOKEN_RENEW: "/auth/token/renew",
      TOKEN_RENEW_SELF: "/auth/token/renew-self",
      TOKEN_REVOKE: "/auth/token/revoke",
      TOKEN_REVOKE_SELF: "/auth/token/revoke-self",
    },

    // Policy routes (global)
    POLICIES: {
      LIST: "/sys/policies/acl",
      GET: (name: string) => `/sys/policies/acl/${name}`,
      CREATE: (name: string) => `/sys/policies/acl/${name}`,
      UPDATE: (name: string) => `/sys/policies/acl/${name}`,
      DELETE: (name: string) => `/sys/policies/acl/${name}`,
      CAPABILITIES: "/sys/capabilities",
    },

    // Secret routes (global, KV v1)
    SECRETS: {
      READ: (path: string) => `/secret/${path}`,
      WRITE: (path: string) => `/secret/${path}`,
      DELETE: (path: string) => `/secret/${path}`,
      LIST: (path: string = "") => (path ? `/secret/${path}/` : "/secret/"),
    },

    // Realm routes
    REALMS: {
      LIST: "/sys/realm",
      CREATE: "/sys/realm",
      GET: (id: string) => `/sys/realm/${id}`,
      UPDATE: (id: string) => `/sys/realm/${id}`,
      DELETE: (id: string) => `/sys/realm/${id}`,
      BY_ORG: (orgId: string) => `/sys/realm/organization/${orgId}`,
    },

    // Realm-scoped Applications
    REALM_APPS: {
      LIST: (realmId: string) => `/realm/${realmId}/sys/apps`,
      CREATE: (realmId: string) => `/realm/${realmId}/sys/apps`,
      GET: (realmId: string, appName: string) => `/realm/${realmId}/sys/apps/${appName}`,
      UPDATE: (realmId: string, appName: string) => `/realm/${realmId}/sys/apps/${appName}`,
      DELETE: (realmId: string, appName: string) => `/realm/${realmId}/sys/apps/${appName}`,
      REGISTER_DEFAULTS: (realmId: string) => `/realm/${realmId}/sys/apps/register-defaults`,
    },

    // Realm-scoped AppRole
    REALM_APPROLE: {
      LIST_ROLES: (realmId: string) => `/realm/${realmId}/auth/approle/role`,
      CREATE_ROLE: (realmId: string, roleName: string) =>
        `/realm/${realmId}/auth/approle/role/${roleName}`,
      GET_ROLE: (realmId: string, roleName: string) =>
        `/realm/${realmId}/auth/approle/role/${roleName}`,
      DELETE_ROLE: (realmId: string, roleName: string) =>
        `/realm/${realmId}/auth/approle/role/${roleName}`,
      GET_ROLE_ID: (realmId: string, roleName: string) =>
        `/realm/${realmId}/auth/approle/role/${roleName}/role-id`,
      GENERATE_SECRET_ID: (realmId: string, roleName: string) =>
        `/realm/${realmId}/auth/approle/role/${roleName}/secret-id`,
      LOGIN: (realmId: string) => `/realm/${realmId}/auth/approle/login`,
    },

    // Realm-scoped Policies
    REALM_POLICIES: {
      LIST: (realmId: string) => `/realm/${realmId}/sys/policies/acl`,
      GET: (realmId: string, name: string) => `/realm/${realmId}/sys/policies/acl/${name}`,
      CREATE: (realmId: string, name: string) => `/realm/${realmId}/sys/policies/acl/${name}`,
      UPDATE: (realmId: string, name: string) => `/realm/${realmId}/sys/policies/acl/${name}`,
      DELETE: (realmId: string, name: string) => `/realm/${realmId}/sys/policies/acl/${name}`,
      CAPABILITIES: (realmId: string) => `/realm/${realmId}/sys/capabilities`,
    },

    // Realm-scoped Secrets
    REALM_SECRETS: {
      READ: (realmId: string, path: string) => `/realm/${realmId}/secret/data/${path}`,
      WRITE: (realmId: string, path: string) => `/realm/${realmId}/secret/data/${path}`,
      DELETE: (realmId: string, path: string) => `/realm/${realmId}/secret/data/${path}`,
      LIST: (realmId: string, path: string = "") =>
        path ? `/realm/${realmId}/secret/metadata/${path}` : `/realm/${realmId}/secret/metadata/`,
    },

    // Realm-scoped Users (UserPass auth)
    REALM_USERS: {
      LIST: (realmId: string) => `/realm/${realmId}/auth/userpass/users`,
      GET: (realmId: string, username: string) => `/realm/${realmId}/auth/userpass/users/${username}`,
      CREATE: (realmId: string, username: string) =>
        `/realm/${realmId}/auth/userpass/users/${username}`,
      UPDATE: (realmId: string, username: string) =>
        `/realm/${realmId}/auth/userpass/users/${username}`,
      DELETE: (realmId: string, username: string) =>
        `/realm/${realmId}/auth/userpass/users/${username}`,
      LOGIN: (realmId: string, username: string) =>
        `/realm/${realmId}/auth/userpass/login/${username}`,
    },
  },

  // EHR (Electronic Health Record) routes
  EHR: {
    /** Patient management (YottaDB API - no /api prefix needed) */
    PATIENTS: {
      LIST: "/v1/ehr/patients",
      GET: (id: string) => `/v1/ehr/patients/${id}`,
      GET_BY_MRN: (mrn: string) => `/v1/ehr/patients/mrn/${mrn}`,
      GET_BY_IEN: (ien: number) => `/v1/ehr/patients/ien/${ien}`,
      CREATE: "/v1/ehr/patients",
      UPDATE: (id: string) => `/v1/ehr/patients/${id}`,
      DELETE: (id: string) => `/v1/ehr/patients/${id}`,
      SEARCH: "/v1/ehr/patients/search",
      BANNER: (id: string) => `/v1/ehr/patients/${id}/banner`,
    },

    /** Visit/Encounter management */
    VISITS: {
      LIST: "/v1/ehr/visits",
      GET: (id: string) => `/v1/ehr/visits/${id}`,
      CREATE: "/v1/ehr/visits",
      UPDATE: (id: string) => `/v1/ehr/visits/${id}`,
      DELETE: (id: string) => `/v1/ehr/visits/${id}`,
      CHECK_IN: (id: string) => `/v1/ehr/visits/${id}/check-in`,
      CHECK_OUT: (id: string) => `/v1/ehr/visits/${id}/check-out`,
      BY_PATIENT: (patientId: string) => `/v1/ehr/patients/${patientId}/visits`,
      TODAY: "/v1/ehr/visits/today",
      ACTIVE: "/v1/ehr/visits/active",
    },

    /** Problem list management */
    PROBLEMS: {
      LIST: "/v1/ehr/problems",
      GET: (id: string) => `/v1/ehr/problems/${id}`,
      CREATE: "/v1/ehr/problems",
      UPDATE: (id: string) => `/v1/ehr/problems/${id}`,
      DELETE: (id: string) => `/v1/ehr/problems/${id}`,
      BY_PATIENT: (patientId: string) => `/v1/ehr/patients/${patientId}/problems`,
      RESOLVE: (id: string) => `/v1/ehr/problems/${id}/resolve`,
      REACTIVATE: (id: string) => `/v1/ehr/problems/${id}/reactivate`,
    },

    /** Medication management */
    MEDICATIONS: {
      LIST: "/v1/ehr/medications",
      GET: (id: string) => `/v1/ehr/medications/${id}`,
      CREATE: "/v1/ehr/medications",
      UPDATE: (id: string) => `/v1/ehr/medications/${id}`,
      DELETE: (id: string) => `/v1/ehr/medications/${id}`,
      BY_PATIENT: (patientId: string) => `/v1/ehr/patients/${patientId}/medications`,
      DISCONTINUE: (id: string) => `/v1/ehr/medications/${id}/discontinue`,
      HOLD: (id: string) => `/v1/ehr/medications/${id}/hold`,
      RESUME: (id: string) => `/v1/ehr/medications/${id}/resume`,
    },

    /** Allergy management */
    ALLERGIES: {
      LIST: "/v1/ehr/allergies",
      GET: (id: string) => `/v1/ehr/allergies/${id}`,
      CREATE: "/v1/ehr/allergies",
      UPDATE: (id: string) => `/v1/ehr/allergies/${id}`,
      DELETE: (id: string) => `/v1/ehr/allergies/${id}`,
      BY_PATIENT: (patientId: string) => `/v1/ehr/patients/${patientId}/allergies`,
      VERIFY: (id: string) => `/v1/ehr/allergies/${id}/verify`,
    },

    /** Vital signs management */
    VITALS: {
      LIST: "/v1/ehr/vitals",
      GET: (id: string) => `/v1/ehr/vitals/${id}`,
      CREATE: "/v1/ehr/vitals",
      UPDATE: (id: string) => `/v1/ehr/vitals/${id}`,
      DELETE: (id: string) => `/v1/ehr/vitals/${id}`,
      BY_PATIENT: (patientId: string) => `/v1/ehr/patients/${patientId}/vitals`,
      BY_VISIT: (visitId: string) => `/v1/ehr/visits/${visitId}/vitals`,
      LATEST: (patientId: string) => `/v1/ehr/patients/${patientId}/vitals/latest`,
      TREND: (patientId: string, vitalType: string) =>
        `/v1/ehr/patients/${patientId}/vitals/trend/${vitalType}`,
    },

    /** Lab results management */
    LABS: {
      LIST: "/v1/ehr/labs",
      GET: (id: string) => `/v1/ehr/labs/${id}`,
      CREATE: "/v1/ehr/labs",
      UPDATE: (id: string) => `/v1/ehr/labs/${id}`,
      DELETE: (id: string) => `/v1/ehr/labs/${id}`,
      BY_PATIENT: (patientId: string) => `/v1/ehr/patients/${patientId}/labs`,
      BY_VISIT: (visitId: string) => `/v1/ehr/visits/${visitId}/labs`,
      BY_ORDER: (orderId: string) => `/v1/ehr/orders/${orderId}/labs`,
      ACTIONABLE: "/v1/ehr/labs/actionable",
    },

    /** Clinical document management */
    DOCUMENTS: {
      LIST: "/v1/ehr/documents",
      GET: (id: string) => `/v1/ehr/documents/${id}`,
      CREATE: "/v1/ehr/documents",
      UPDATE: (id: string) => `/v1/ehr/documents/${id}`,
      DELETE: (id: string) => `/v1/ehr/documents/${id}`,
      BY_PATIENT: (patientId: string) => `/v1/ehr/patients/${patientId}/documents`,
      BY_VISIT: (visitId: string) => `/v1/ehr/visits/${visitId}/documents`,
      SIGN: (id: string) => `/v1/ehr/documents/${id}/sign`,
      COSIGN: (id: string) => `/v1/ehr/documents/${id}/cosign`,
      ADDENDUM: (id: string) => `/v1/ehr/documents/${id}/addendum`,
      UNSIGNED: "/v1/ehr/documents/unsigned",
    },

    /** Order entry management */
    ORDERS: {
      LIST: "/v1/ehr/orders",
      GET: (id: string) => `/v1/ehr/orders/${id}`,
      CREATE: "/v1/ehr/orders",
      UPDATE: (id: string) => `/v1/ehr/orders/${id}`,
      DELETE: (id: string) => `/v1/ehr/orders/${id}`,
      BY_PATIENT: (patientId: string) => `/v1/ehr/patients/${patientId}/orders`,
      BY_VISIT: (visitId: string) => `/v1/ehr/visits/${visitId}/orders`,
      SIGN: (id: string) => `/v1/ehr/orders/${id}/sign`,
      DISCONTINUE: (id: string) => `/v1/ehr/orders/${id}/discontinue`,
      HOLD: (id: string) => `/v1/ehr/orders/${id}/hold`,
      RELEASE: (id: string) => `/v1/ehr/orders/${id}/release`,
      UNSIGNED: "/v1/ehr/orders/unsigned",
      STAT: "/v1/ehr/orders/stat",
    },

    /** Appointment/Scheduling management */
    APPOINTMENTS: {
      LIST: "/v1/ehr/appointments",
      GET: (id: string) => `/v1/ehr/appointments/${id}`,
      CREATE: "/v1/ehr/appointments",
      UPDATE: (id: string) => `/v1/ehr/appointments/${id}`,
      DELETE: (id: string) => `/v1/ehr/appointments/${id}`,
      BY_PATIENT: (patientId: string) => `/v1/ehr/patients/${patientId}/appointments`,
      BY_PROVIDER: (providerId: string) => `/v1/ehr/providers/${providerId}/appointments`,
      BY_LOCATION: (locationId: string) => `/v1/ehr/locations/${locationId}/appointments`,
      CHECK_IN: (id: string) => `/v1/ehr/appointments/${id}/check-in`,
      CANCEL: (id: string) => `/v1/ehr/appointments/${id}/cancel`,
      RESCHEDULE: (id: string) => `/v1/ehr/appointments/${id}/reschedule`,
      NO_SHOW: (id: string) => `/v1/ehr/appointments/${id}/no-show`,
      TODAY: "/v1/ehr/appointments/today",
      CHECKED_IN: "/v1/ehr/appointments/checked-in",
      SCHEDULE: (providerId: string, date: string) =>
        `/v1/ehr/providers/${providerId}/schedule/${date}`,
    },

    /** Form templates */
    FORM_TEMPLATES: {
      LIST: "/v1/ehr/form-templates",
      GET: (id: string) => `/v1/ehr/form-templates/${id}`,
      GET_BY_CODE: (code: string) => `/v1/ehr/form-templates/code/${code}`,
    },

    /** Clinical code search */
    CODES: {
      ICD10_SEARCH: "/v1/ehr/codes/icd10",
      LOINC_SEARCH: "/v1/ehr/codes/loinc",
      RXNORM_SEARCH: "/v1/ehr/codes/rxnorm",
      SNOMED_SEARCH: "/v1/ehr/codes/snomed",
    },

    /** Encounter management */
    ENCOUNTERS: {
      LIST: "/v1/ehr/encounters",
      GET: (id: string) => `/v1/ehr/encounters/${id}`,
      CREATE: "/v1/ehr/encounters",
      UPDATE: (id: string) => `/v1/ehr/encounters/${id}`,
      COMPLETE: (id: string) => `/v1/ehr/encounters/${id}/complete`,
      BY_PATIENT: (patientId: string) => `/v1/ehr/patients/${patientId}/encounters`,
    },

    /** 3D Anatomy-based clinical documentation */
    ANATOMY_FINDINGS: {
      LIST: (encounterId: string) => `/v1/ehr/encounters/${encounterId}/anatomy-findings`,
      GET: (encounterId: string, findingId: string) => `/v1/ehr/encounters/${encounterId}/anatomy-findings/${findingId}`,
      CREATE: (encounterId: string) => `/v1/ehr/encounters/${encounterId}/anatomy-findings`,
      UPDATE: (encounterId: string, findingId: string) => `/v1/ehr/encounters/${encounterId}/anatomy-findings/${findingId}`,
      DELETE: (encounterId: string, findingId: string) => `/v1/ehr/encounters/${encounterId}/anatomy-findings/${findingId}`,
    },

    /** Body systems taxonomy for 3D anatomy */
    BODY_SYSTEMS: {
      LIST: "/v1/ehr/body-systems",
      GET: (id: string) => `/v1/ehr/body-systems/${id}`,
      LAB_RECOMMENDATIONS: (id: string) => `/v1/ehr/body-systems/${id}/lab-recommendations`,
    },
  },

  // Pharmacy routes (Drug catalog and interaction checking)
  PHARMACY: {
    /** Drug catalogs by jurisdiction */
    CATALOGS: {
      LIST: "/v1/pharmacy/catalogs",
      GET: (id: string) => `/v1/pharmacy/catalogs/${id}`,
      SCHEDULES: (catalogId: string) => `/v1/pharmacy/catalogs/${catalogId}/schedules`,
    },

    /** Drug database */
    DRUGS: {
      SEARCH: "/v1/pharmacy/drugs/search",
      GET: (id: string) => `/v1/pharmacy/drugs/${id}`,
      INTERACTIONS: (id: string) => `/v1/pharmacy/drugs/${id}/interactions`,
      CONTRAINDICATIONS: (id: string) => `/v1/pharmacy/drugs/${id}/contraindications`,
      BY_CATALOG: (catalogId: string) => `/v1/pharmacy/catalogs/${catalogId}/drugs`,
    },

    /** Drug interaction checking */
    INTERACTIONS: {
      CHECK: "/v1/pharmacy/interactions/check",
      CHECK_WITH_PATIENT: (patientId: string) => `/v1/pharmacy/patients/${patientId}/interactions/check`,
    },

    /** Allergy checking */
    ALLERGY_CHECK: {
      CHECK: "/v1/pharmacy/allergy-check",
      CHECK_WITH_PATIENT: (patientId: string) => `/v1/pharmacy/patients/${patientId}/allergy-check`,
    },

    /** Prescriptions (pharmacy workflow) */
    PRESCRIPTIONS: {
      LIST: "/v1/pharmacy/prescriptions",
      GET: (id: string) => `/v1/pharmacy/prescriptions/${id}`,
      CREATE: "/v1/pharmacy/prescriptions",
      UPDATE: (id: string) => `/v1/pharmacy/prescriptions/${id}`,
      VERIFY: (id: string) => `/v1/pharmacy/prescriptions/${id}/verify`,
      DISPENSE: (id: string) => `/v1/pharmacy/prescriptions/${id}/dispense`,
      CANCEL: (id: string) => `/v1/pharmacy/prescriptions/${id}/cancel`,
      BY_PATIENT: (patientId: string) => `/v1/pharmacy/patients/${patientId}/prescriptions`,
      PENDING: "/v1/pharmacy/prescriptions/pending",
      READY: "/v1/pharmacy/prescriptions/ready",
    },
  },

  // Billing routes (GST-compliant billing system)
  BILLING: {
    /** Service Catalog */
    SERVICES: {
      LIST: "/v1/billing/services",
      GET: (id: string) => `/v1/billing/services/${id}`,
      CREATE: "/v1/billing/services",
      SEARCH: "/v1/billing/services",
    },

    /** Service Categories */
    CATEGORIES: {
      LIST: "/v1/billing/categories",
      CREATE: "/v1/billing/categories",
    },

    /** Tax Codes (HSN/SAC) */
    TAX_CODES: {
      LIST: "/v1/billing/tax-codes",
    },

    /** Service Packages */
    PACKAGES: {
      LIST: "/v1/billing/packages",
    },

    /** Invoices */
    INVOICES: {
      LIST: "/v1/billing/invoices",
      GET: (id: string) => `/v1/billing/invoices/${id}`,
      CREATE: "/v1/billing/invoices",
      ADD_ITEM: (id: string) => `/v1/billing/invoices/${id}/items`,
      FINALIZE: (id: string) => `/v1/billing/invoices/${id}/finalize`,
      CANCEL: (id: string) => `/v1/billing/invoices/${id}/cancel`,
      BY_PATIENT: (patientId: string) => `/v1/billing/patients/${patientId}/invoices`,
    },

    /** Payments */
    PAYMENTS: {
      LIST: "/v1/billing/payments",
      GET: (id: string) => `/v1/billing/payments/${id}`,
      CREATE: "/v1/billing/payments",
      ALLOCATE: (id: string) => `/v1/billing/payments/${id}/allocate`,
      REFUND: (id: string) => `/v1/billing/payments/${id}/refund`,
      BY_PATIENT: (patientId: string) => `/v1/billing/patients/${patientId}/payments`,
    },

    /** Patient Billing */
    PATIENTS: {
      BALANCE: (id: string) => `/v1/billing/patients/${id}/balance`,
      ACCOUNT: (id: string) => `/v1/billing/patients/${id}/account`,
      STATEMENTS: (id: string) => `/v1/billing/patients/${id}/statements`,
    },

    /** Insurance */
    INSURANCE: {
      PAYERS: {
        LIST: "/v1/billing/insurance/payers",
        GET: (id: string) => `/v1/billing/insurance/payers/${id}`,
        CREATE: "/v1/billing/insurance/payers",
      },
      PLANS: {
        LIST: "/v1/billing/insurance/plans",
        GET: (id: string) => `/v1/billing/insurance/plans/${id}`,
        BY_PAYER: (payerId: string) => `/v1/billing/insurance/payers/${payerId}/plans`,
      },
      POLICIES: {
        LIST: "/v1/billing/insurance/policies",
        GET: (id: string) => `/v1/billing/insurance/policies/${id}`,
        CREATE: "/v1/billing/insurance/policies",
        BY_PATIENT: (patientId: string) => `/v1/billing/patients/${patientId}/policies`,
      },
      PREAUTHS: {
        LIST: "/v1/billing/insurance/preauths",
        GET: (id: string) => `/v1/billing/insurance/preauths/${id}`,
        CREATE: "/v1/billing/insurance/preauths",
        UPDATE: (id: string) => `/v1/billing/insurance/preauths/${id}`,
        SUBMIT: (id: string) => `/v1/billing/insurance/preauths/${id}/submit`,
        APPROVE: (id: string) => `/v1/billing/insurance/preauths/${id}/approve`,
        DENY: (id: string) => `/v1/billing/insurance/preauths/${id}/deny`,
        BY_PATIENT: (patientId: string) => `/v1/billing/patients/${patientId}/preauths`,
      },
      CLAIMS: {
        LIST: "/v1/billing/insurance/claims",
        GET: (id: string) => `/v1/billing/insurance/claims/${id}`,
        CREATE: "/v1/billing/insurance/claims",
        SUBMIT: (id: string) => `/v1/billing/insurance/claims/${id}/submit`,
        UPDATE_STATUS: (id: string) => `/v1/billing/insurance/claims/${id}/status`,
        BY_PATIENT: (patientId: string) => `/v1/billing/patients/${patientId}/claims`,
        BY_INVOICE: (invoiceId: string) => `/v1/billing/invoices/${invoiceId}/claims`,
      },
    },
  },

  // Department Management routes
  DEPARTMENTS: {
    /** Wards */
    WARDS: {
      LIST: "/v1/departments/wards",
      GET: (id: string) => `/v1/departments/wards/${id}`,
      CREATE: "/v1/departments/wards",
      UPDATE: (id: string) => `/v1/departments/wards/${id}`,
      CENSUS: (id: string) => `/v1/departments/wards/${id}/census`,
      BEDS: (id: string) => `/v1/departments/wards/${id}/beds`,
      ALL_CENSUS: "/v1/departments/wards/census",
    },

    /** Beds */
    BEDS: {
      LIST: "/v1/departments/beds",
      GET: (id: string) => `/v1/departments/beds/${id}`,
      CREATE: "/v1/departments/beds",
      UPDATE: (id: string) => `/v1/departments/beds/${id}`,
      ALLOCATE: (id: string) => `/v1/departments/beds/${id}/allocate`,
      RELEASE: (id: string) => `/v1/departments/beds/${id}/release`,
      TRANSFER: "/v1/departments/beds/transfer",
      AVAILABLE: "/v1/departments/beds/available",
      HISTORY: (id: string) => `/v1/departments/beds/${id}/history`,
      OCCUPANCY: "/v1/departments/beds/occupancy",
    },

    /** OPD Queue Management */
    OPD: {
      QUEUE: {
        LIST: "/v1/departments/opd/queue",
        CHECK_IN: "/v1/departments/opd/queue/checkin",
        CALL_NEXT: "/v1/departments/opd/queue/call-next",
        UPDATE_STATUS: (id: string) => `/v1/departments/opd/queue/${id}/status`,
        CANCEL: (id: string) => `/v1/departments/opd/queue/${id}/cancel`,
        BY_DOCTOR: (doctorId: string) => `/v1/departments/opd/queue/doctor/${doctorId}`,
      },
      DASHBOARD: "/v1/departments/opd/dashboard",
      ROOMS: "/v1/departments/opd/rooms",
      DISPLAY_BOARD: "/v1/departments/opd/display-board",
    },

    /** IPD Admissions */
    IPD: {
      ADMISSIONS: {
        LIST: "/v1/departments/ipd/admissions",
        GET: (id: string) => `/v1/departments/ipd/admissions/${id}`,
        CREATE: "/v1/departments/ipd/admissions",
        DISCHARGE: (id: string) => `/v1/departments/ipd/admissions/${id}/discharge`,
        TRANSFER: (id: string) => `/v1/departments/ipd/admissions/${id}/transfer`,
        BY_PATIENT: (patientId: string) => `/v1/departments/ipd/patients/${patientId}/admissions`,
        CURRENT: (patientId: string) => `/v1/departments/ipd/patients/${patientId}/current`,
      },
      CENSUS: "/v1/departments/ipd/census",
      DASHBOARD: "/v1/departments/ipd/dashboard",
      PENDING_DISCHARGES: "/v1/departments/ipd/pending-discharges",
      DISCHARGE_SUMMARY: (id: string) => `/v1/departments/ipd/admissions/${id}/discharge-summary`,
    },

    /** Operating Theatre */
    OT: {
      THEATRES: {
        LIST: "/v1/departments/ot/theatres",
        GET: (id: string) => `/v1/departments/ot/theatres/${id}`,
        CREATE: "/v1/departments/ot/theatres",
        UPDATE: (id: string) => `/v1/departments/ot/theatres/${id}`,
        AVAILABILITY: (id: string) => `/v1/departments/ot/theatres/${id}/availability`,
      },
      SURGERIES: {
        LIST: "/v1/departments/ot/surgeries",
        GET: (id: string) => `/v1/departments/ot/surgeries/${id}`,
        SCHEDULE: "/v1/departments/ot/surgeries",
        UPDATE_STATUS: (id: string) => `/v1/departments/ot/surgeries/${id}/status`,
        START: (id: string) => `/v1/departments/ot/surgeries/${id}/start`,
        COMPLETE: (id: string) => `/v1/departments/ot/surgeries/${id}/complete`,
        CANCEL: (id: string) => `/v1/departments/ot/surgeries/${id}/cancel`,
        RESCHEDULE: (id: string) => `/v1/departments/ot/surgeries/${id}/reschedule`,
        BY_PATIENT: (patientId: string) => `/v1/departments/ot/patients/${patientId}/surgeries`,
        TODAY: "/v1/departments/ot/surgeries/today",
      },
      DASHBOARD: "/v1/departments/ot/dashboard",
      SCHEDULE_BOARD: "/v1/departments/ot/schedule-board",
      AVAILABILITY: "/v1/departments/ot/availability",
    },
  },

  // Diagnostics (Laboratory and Radiology) routes
  DIAGNOSTICS: {
    /** Laboratory (LIS) */
    LAB: {
      /** Test Catalog */
      TESTS: {
        LIST: "/v1/diagnostics/lab/tests",
        GET: (id: string) => `/v1/diagnostics/lab/tests/${id}`,
        CREATE: "/v1/diagnostics/lab/tests",
        UPDATE: (id: string) => `/v1/diagnostics/lab/tests/${id}`,
        SEARCH: "/v1/diagnostics/lab/tests/search",
        BY_CATEGORY: (category: string) => `/v1/diagnostics/lab/tests/category/${category}`,
      },

      /** Test Panels */
      PANELS: {
        LIST: "/v1/diagnostics/lab/panels",
        GET: (id: string) => `/v1/diagnostics/lab/panels/${id}`,
        CREATE: "/v1/diagnostics/lab/panels",
        UPDATE: (id: string) => `/v1/diagnostics/lab/panels/${id}`,
      },

      /** Reference Ranges */
      REFERENCE_RANGES: {
        LIST: (testId: string) => `/v1/diagnostics/lab/tests/${testId}/ranges`,
        CREATE: (testId: string) => `/v1/diagnostics/lab/tests/${testId}/ranges`,
        UPDATE: (testId: string, rangeId: string) =>
          `/v1/diagnostics/lab/tests/${testId}/ranges/${rangeId}`,
      },

      /** Lab Orders */
      ORDERS: {
        LIST: "/v1/diagnostics/lab/orders",
        GET: (id: string) => `/v1/diagnostics/lab/orders/${id}`,
        CREATE: "/v1/diagnostics/lab/orders",
        CANCEL: (id: string) => `/v1/diagnostics/lab/orders/${id}/cancel`,
        BY_PATIENT: (patientId: string) => `/v1/diagnostics/lab/patients/${patientId}/orders`,
        PENDING: "/v1/diagnostics/lab/orders/pending",
      },

      /** Samples */
      SAMPLES: {
        LIST: "/v1/diagnostics/lab/samples",
        GET: (id: string) => `/v1/diagnostics/lab/samples/${id}`,
        COLLECT: "/v1/diagnostics/lab/samples/collect",
        RECEIVE: (id: string) => `/v1/diagnostics/lab/samples/${id}/receive`,
        REJECT: (id: string) => `/v1/diagnostics/lab/samples/${id}/reject`,
        BY_ORDER: (orderId: string) => `/v1/diagnostics/lab/orders/${orderId}/samples`,
        PENDING_COLLECTION: "/v1/diagnostics/lab/samples/pending-collection",
        PENDING_RECEIPT: "/v1/diagnostics/lab/samples/pending-receipt",
      },

      /** Lab Results */
      RESULTS: {
        LIST: "/v1/diagnostics/lab/results",
        GET: (id: string) => `/v1/diagnostics/lab/results/${id}`,
        ENTER: "/v1/diagnostics/lab/results",
        UPDATE: (id: string) => `/v1/diagnostics/lab/results/${id}`,
        VERIFY: (id: string) => `/v1/diagnostics/lab/results/${id}/verify`,
        UNVERIFY: (id: string) => `/v1/diagnostics/lab/results/${id}/unverify`,
        BY_SAMPLE: (sampleId: string) => `/v1/diagnostics/lab/samples/${sampleId}/results`,
        BY_PATIENT: (patientId: string) => `/v1/diagnostics/lab/patients/${patientId}/results`,
        CRITICAL: "/v1/diagnostics/lab/results/critical",
        PENDING_VERIFICATION: "/v1/diagnostics/lab/results/pending-verification",
        NOTIFY_CRITICAL: (id: string) => `/v1/diagnostics/lab/results/${id}/notify-critical`,
      },

      /** Lab Reports */
      REPORTS: {
        LIST: "/v1/diagnostics/lab/reports",
        GET: (id: string) => `/v1/diagnostics/lab/reports/${id}`,
        GENERATE: (orderId: string) => `/v1/diagnostics/lab/orders/${orderId}/report`,
        SIGN: (id: string) => `/v1/diagnostics/lab/reports/${id}/sign`,
        PRINT: (id: string) => `/v1/diagnostics/lab/reports/${id}/print`,
        BY_PATIENT: (patientId: string) => `/v1/diagnostics/lab/patients/${patientId}/reports`,
      },

      /** Worklists */
      WORKLIST: {
        COLLECTION: "/v1/diagnostics/lab/worklist/collection",
        PROCESSING: "/v1/diagnostics/lab/worklist/processing",
        VERIFICATION: "/v1/diagnostics/lab/worklist/verification",
      },

      /** Dashboard */
      DASHBOARD: "/v1/diagnostics/lab/dashboard",
    },

    /** Radiology (RIS) */
    RADIOLOGY: {
      /** Exam Types (Catalog) */
      EXAM_TYPES: {
        LIST: "/v1/diagnostics/radiology/exam-types",
        GET: (id: string) => `/v1/diagnostics/radiology/exam-types/${id}`,
        CREATE: "/v1/diagnostics/radiology/exam-types",
        UPDATE: (id: string) => `/v1/diagnostics/radiology/exam-types/${id}`,
        SEARCH: "/v1/diagnostics/radiology/exam-types/search",
        BY_MODALITY: (modality: string) => `/v1/diagnostics/radiology/exam-types/modality/${modality}`,
      },

      /** Radiology Rooms/Equipment */
      ROOMS: {
        LIST: "/v1/diagnostics/radiology/rooms",
        GET: (id: string) => `/v1/diagnostics/radiology/rooms/${id}`,
        CREATE: "/v1/diagnostics/radiology/rooms",
        UPDATE: (id: string) => `/v1/diagnostics/radiology/rooms/${id}`,
        STATUS: (id: string) => `/v1/diagnostics/radiology/rooms/${id}/status`,
        BY_MODALITY: (modality: string) => `/v1/diagnostics/radiology/rooms/modality/${modality}`,
      },

      /** Radiology Orders */
      ORDERS: {
        LIST: "/v1/diagnostics/radiology/orders",
        GET: (id: string) => `/v1/diagnostics/radiology/orders/${id}`,
        CREATE: "/v1/diagnostics/radiology/orders",
        CANCEL: (id: string) => `/v1/diagnostics/radiology/orders/${id}/cancel`,
        BY_PATIENT: (patientId: string) => `/v1/diagnostics/radiology/patients/${patientId}/orders`,
        PENDING: "/v1/diagnostics/radiology/orders/pending",
      },

      /** Radiology Exams */
      EXAMS: {
        LIST: "/v1/diagnostics/radiology/exams",
        GET: (id: string) => `/v1/diagnostics/radiology/exams/${id}`,
        SCHEDULE: (orderExamId: string) =>
          `/v1/diagnostics/radiology/order-exams/${orderExamId}/schedule`,
        START: (id: string) => `/v1/diagnostics/radiology/exams/${id}/start`,
        COMPLETE: (id: string) => `/v1/diagnostics/radiology/exams/${id}/complete`,
        CANCEL: (id: string) => `/v1/diagnostics/radiology/exams/${id}/cancel`,
        BY_PATIENT: (patientId: string) => `/v1/diagnostics/radiology/patients/${patientId}/exams`,
        TODAY: "/v1/diagnostics/radiology/exams/today",
        IN_PROGRESS: "/v1/diagnostics/radiology/exams/in-progress",
      },

      /** Radiology Reports */
      REPORTS: {
        LIST: "/v1/diagnostics/radiology/reports",
        GET: (id: string) => `/v1/diagnostics/radiology/reports/${id}`,
        CREATE: (examId: string) => `/v1/diagnostics/radiology/exams/${examId}/report`,
        UPDATE: (id: string) => `/v1/diagnostics/radiology/reports/${id}`,
        SIGN: (id: string) => `/v1/diagnostics/radiology/reports/${id}/sign`,
        ADDENDUM: (id: string) => `/v1/diagnostics/radiology/reports/${id}/addendum`,
        BY_PATIENT: (patientId: string) => `/v1/diagnostics/radiology/patients/${patientId}/reports`,
        PENDING: "/v1/diagnostics/radiology/reports/pending",
        CRITICAL: "/v1/diagnostics/radiology/reports/critical",
        NOTIFY_CRITICAL: (id: string) => `/v1/diagnostics/radiology/reports/${id}/notify-critical`,
      },

      /** Report Templates */
      TEMPLATES: {
        LIST: "/v1/diagnostics/radiology/templates",
        GET: (id: string) => `/v1/diagnostics/radiology/templates/${id}`,
        CREATE: "/v1/diagnostics/radiology/templates",
        UPDATE: (id: string) => `/v1/diagnostics/radiology/templates/${id}`,
        BY_MODALITY: (modality: string) =>
          `/v1/diagnostics/radiology/templates/modality/${modality}`,
      },

      /** Worklists */
      WORKLIST: {
        SCHEDULING: "/v1/diagnostics/radiology/worklist/scheduling",
        TECHNICIAN: "/v1/diagnostics/radiology/worklist/technician",
        RADIOLOGIST: "/v1/diagnostics/radiology/worklist/radiologist",
      },

      /** Schedule */
      SCHEDULE: {
        GET: (date: string) => `/v1/diagnostics/radiology/schedule/${date}`,
        ROOM: (roomId: string, date: string) =>
          `/v1/diagnostics/radiology/rooms/${roomId}/schedule/${date}`,
      },

      /** Dashboard */
      DASHBOARD: "/v1/diagnostics/radiology/dashboard",
    },
  },

  // Analytics and Dashboards
  ANALYTICS: {
    /** Clinical Dashboard */
    CLINICAL: {
      SUMMARY: "/v1/analytics/clinical/summary",
      CENSUS: "/v1/analytics/clinical/census",
      CENSUS_BY_DEPARTMENT: "/v1/analytics/clinical/census/by-department",
      CENSUS_TREND: "/v1/analytics/clinical/census/trend",
      DEPARTMENT_STATS: "/v1/analytics/clinical/departments",
      DEPARTMENT_PERFORMANCE: (id: string) => `/v1/analytics/clinical/departments/${id}/performance`,
      TAT_METRICS: "/v1/analytics/clinical/tat",
      TAT_BY_PRIORITY: "/v1/analytics/clinical/tat/by-priority",
      APPOINTMENTS: "/v1/analytics/clinical/appointments",
      APPOINTMENTS_TREND: "/v1/analytics/clinical/appointments/trend",
      VITALS_SUMMARY: "/v1/analytics/clinical/vitals",
      ALERTS: "/v1/analytics/clinical/alerts",
      ALERTS_ACKNOWLEDGE: (id: string) => `/v1/analytics/clinical/alerts/${id}/acknowledge`,
    },

    /** Financial Dashboard */
    FINANCIAL: {
      SUMMARY: "/v1/analytics/financial/summary",
      REVENUE: "/v1/analytics/financial/revenue",
      REVENUE_BY_DEPARTMENT: "/v1/analytics/financial/revenue/by-department",
      REVENUE_BY_SERVICE: "/v1/analytics/financial/revenue/by-service",
      REVENUE_TREND: "/v1/analytics/financial/revenue/trend",
      BILLING_STATS: "/v1/analytics/financial/billing",
      BILLING_AGING: "/v1/analytics/financial/billing/aging",
      PAYMENT_STATS: "/v1/analytics/financial/payments",
      PAYMENT_BY_METHOD: "/v1/analytics/financial/payments/by-method",
      PAYMENT_TREND: "/v1/analytics/financial/payments/trend",
      INSURANCE_STATS: "/v1/analytics/financial/insurance",
      INSURANCE_BY_PROVIDER: "/v1/analytics/financial/insurance/by-provider",
      CLAIMS_TREND: "/v1/analytics/financial/insurance/claims/trend",
      EXPENSES: "/v1/analytics/financial/expenses",
      EXPENSES_BY_CATEGORY: "/v1/analytics/financial/expenses/by-category",
      KPIS: "/v1/analytics/financial/kpis",
    },

    /** Operational Dashboard */
    OPERATIONAL: {
      SUMMARY: "/v1/analytics/operational/summary",
      BED_OCCUPANCY: "/v1/analytics/operational/beds/occupancy",
      BED_OCCUPANCY_BY_WARD: "/v1/analytics/operational/beds/occupancy/by-ward",
      BED_OCCUPANCY_TREND: "/v1/analytics/operational/beds/occupancy/trend",
      RESOURCE_UTILIZATION: "/v1/analytics/operational/resources",
      OT_UTILIZATION: "/v1/analytics/operational/ot/utilization",
      EQUIPMENT_STATUS: "/v1/analytics/operational/equipment",
      STAFF_OVERVIEW: "/v1/analytics/operational/staff",
      STAFF_BY_ROLE: "/v1/analytics/operational/staff/by-role",
      STAFF_SCHEDULE: "/v1/analytics/operational/staff/schedule",
      QUEUE_STATS: "/v1/analytics/operational/queues",
      QUEUE_TREND: "/v1/analytics/operational/queues/trend",
      INVENTORY_OVERVIEW: "/v1/analytics/operational/inventory",
      INVENTORY_ALERTS: "/v1/analytics/operational/inventory/alerts",
      EMERGENCY_STATS: "/v1/analytics/operational/emergency",
      KPIS: "/v1/analytics/operational/kpis",
    },

    /** Compliance Dashboard */
    COMPLIANCE: {
      SUMMARY: "/v1/analytics/compliance/summary",
      AUDIT_STATS: "/v1/analytics/compliance/audit",
      AUDIT_BY_ACTION: "/v1/analytics/compliance/audit/by-action",
      AUDIT_BY_ENTITY: "/v1/analytics/compliance/audit/by-entity",
      AUDIT_BY_USER: "/v1/analytics/compliance/audit/by-user",
      AUDIT_TREND: "/v1/analytics/compliance/audit/trend",
      AUDIT_EXPORT: "/v1/analytics/compliance/audit/export",
      PHI_ACCESS: "/v1/analytics/compliance/phi-access",
      PHI_ACCESS_BY_PURPOSE: "/v1/analytics/compliance/phi-access/by-purpose",
      PHI_ACCESS_BY_ROLE: "/v1/analytics/compliance/phi-access/by-role",
      PHI_ALERTS: "/v1/analytics/compliance/phi-access/alerts",
      PHI_ALERT_REVIEW: (id: string) => `/v1/analytics/compliance/phi-access/alerts/${id}/review`,
      COMPLIANCE_STATUS: "/v1/analytics/compliance/status",
      COMPLIANCE_BY_REGULATION: "/v1/analytics/compliance/status/by-regulation",
      COMPLIANCE_DEADLINES: "/v1/analytics/compliance/deadlines",
      COMPLIANCE_FINDINGS: "/v1/analytics/compliance/findings",
      FINDING_UPDATE: (id: string) => `/v1/analytics/compliance/findings/${id}`,
      TRAINING_OVERVIEW: "/v1/analytics/compliance/training",
      TRAINING_BY_PROGRAM: "/v1/analytics/compliance/training/by-program",
      TRAINING_EXPIRATIONS: "/v1/analytics/compliance/training/expirations",
      SECURITY_METRICS: "/v1/analytics/compliance/security",
      SECURITY_INCIDENTS: "/v1/analytics/compliance/security/incidents",
      DATA_RETENTION: "/v1/analytics/compliance/data-retention",
    },

    /** Reports */
    REPORTS: {
      LIST: "/v1/analytics/reports",
      GET: (id: string) => `/v1/analytics/reports/${id}`,
      GENERATE: "/v1/analytics/reports/generate",
      SCHEDULE: "/v1/analytics/reports/schedule",
      SCHEDULED_LIST: "/v1/analytics/reports/scheduled",
      SCHEDULED_UPDATE: (id: string) => `/v1/analytics/reports/scheduled/${id}`,
      SCHEDULED_DELETE: (id: string) => `/v1/analytics/reports/scheduled/${id}`,
      TEMPLATES: "/v1/analytics/reports/templates",
      TEMPLATE_GET: (id: string) => `/v1/analytics/reports/templates/${id}`,
    },

    /** Export */
    EXPORT: {
      CSV: "/v1/analytics/export/csv",
      PDF: "/v1/analytics/export/pdf",
      EXCEL: "/v1/analytics/export/excel",
    },
  },

  // ============================================================================
  // Workflow Engine
  // ============================================================================
  WORKFLOWS: {
    /** Workflow Definitions */
    DEFINITIONS: {
      LIST: "/v1/workflows",
      GET: (id: string) => `/v1/workflows/${id}`,
      CREATE: "/v1/workflows",
      UPDATE: (id: string) => `/v1/workflows/${id}`,
      DELETE: (id: string) => `/v1/workflows/${id}`,
      ACTIVATE: (id: string) => `/v1/workflows/${id}/activate`,
      DEACTIVATE: (id: string) => `/v1/workflows/${id}/deactivate`,
      VERSIONS: (id: string) => `/v1/workflows/${id}/versions`,
      DUPLICATE: (id: string) => `/v1/workflows/${id}/duplicate`,
      EXPORT: (id: string) => `/v1/workflows/${id}/export`,
      IMPORT: "/v1/workflows/import",
    },

    /** Workflow Instances */
    INSTANCES: {
      LIST: "/v1/workflows/instances",
      GET: (id: string) => `/v1/workflows/instances/${id}`,
      START: "/v1/workflows/instances/start",
      PAUSE: (id: string) => `/v1/workflows/instances/${id}/pause`,
      RESUME: (id: string) => `/v1/workflows/instances/${id}/resume`,
      CANCEL: (id: string) => `/v1/workflows/instances/${id}/cancel`,
      RETRY: (id: string) => `/v1/workflows/instances/${id}/retry`,
      HISTORY: (id: string) => `/v1/workflows/instances/${id}/history`,
      VARIABLES: (id: string) => `/v1/workflows/instances/${id}/variables`,
    },

    /** Human Tasks */
    TASKS: {
      LIST: "/v1/workflows/tasks",
      MY_TASKS: "/v1/workflows/tasks/my",
      GET: (id: string) => `/v1/workflows/tasks/${id}`,
      CLAIM: (id: string) => `/v1/workflows/tasks/${id}/claim`,
      UNCLAIM: (id: string) => `/v1/workflows/tasks/${id}/unclaim`,
      COMPLETE: (id: string) => `/v1/workflows/tasks/${id}/complete`,
      DELEGATE: (id: string) => `/v1/workflows/tasks/${id}/delegate`,
      ESCALATE: (id: string) => `/v1/workflows/tasks/${id}/escalate`,
    },

    /** Workflow Templates */
    TEMPLATES: {
      LIST: "/v1/workflows/templates",
      GET: (id: string) => `/v1/workflows/templates/${id}`,
      CREATE_FROM: (id: string) => `/v1/workflows/templates/${id}/create`,
    },

    /** Workflow Analytics */
    ANALYTICS: {
      SUMMARY: "/v1/workflows/analytics/summary",
      BY_STATUS: "/v1/workflows/analytics/by-status",
      BY_WORKFLOW: "/v1/workflows/analytics/by-workflow",
      PERFORMANCE: "/v1/workflows/analytics/performance",
      BOTTLENECKS: "/v1/workflows/analytics/bottlenecks",
    },
  },

  // ============================================================================
  // Rules Engine (ZenEngine)
  // ============================================================================
  RULES: {
    /** Decision Rules */
    DECISIONS: {
      LIST: "/v1/rules/decisions",
      GET: (id: string) => `/v1/rules/decisions/${id}`,
      CREATE: "/v1/rules/decisions",
      UPDATE: (id: string) => `/v1/rules/decisions/${id}`,
      DELETE: (id: string) => `/v1/rules/decisions/${id}`,
      ACTIVATE: (id: string) => `/v1/rules/decisions/${id}/activate`,
      DEACTIVATE: (id: string) => `/v1/rules/decisions/${id}/deactivate`,
      TEST: (id: string) => `/v1/rules/decisions/${id}/test`,
      EVALUATE: (id: string) => `/v1/rules/decisions/${id}/evaluate`,
      VERSIONS: (id: string) => `/v1/rules/decisions/${id}/versions`,
      DUPLICATE: (id: string) => `/v1/rules/decisions/${id}/duplicate`,
      EXPORT: (id: string) => `/v1/rules/decisions/${id}/export`,
      IMPORT: "/v1/rules/decisions/import",
    },

    /** Rule Categories */
    CATEGORIES: {
      LIST: "/v1/rules/categories",
      BY_CATEGORY: (category: string) => `/v1/rules/categories/${category}`,
    },

    /** Tax Rules */
    TAX: {
      CALCULATE: "/v1/rules/tax/calculate",
      JURISDICTIONS: "/v1/rules/tax/jurisdictions",
      JURISDICTION_GET: (id: string) => `/v1/rules/tax/jurisdictions/${id}`,
      COMPONENTS: "/v1/rules/tax/components",
      COMPONENT_GET: (id: string) => `/v1/rules/tax/components/${id}`,
    },

    /** Drug Scheduling Rules */
    DRUG_SCHEDULING: {
      CHECK: "/v1/rules/drug-scheduling/check",
      BY_COUNTRY: (countryCode: string) => `/v1/rules/drug-scheduling/countries/${countryCode}`,
      SCHEDULES: "/v1/rules/drug-scheduling/schedules",
    },

    /** Clinical Decision Support */
    CLINICAL: {
      CHECK_INTERACTIONS: "/v1/rules/clinical/interactions",
      CHECK_ALLERGIES: "/v1/rules/clinical/allergies",
      CHECK_CONTRAINDICATIONS: "/v1/rules/clinical/contraindications",
      DOSING_CALCULATOR: "/v1/rules/clinical/dosing",
      ALERTS: "/v1/rules/clinical/alerts",
    },

    /** Compliance Rules */
    COMPLIANCE: {
      CHECK: "/v1/rules/compliance/check",
      BY_REGULATION: (regulationId: string) => `/v1/rules/compliance/regulations/${regulationId}`,
      VALIDATE_PHI: "/v1/rules/compliance/validate-phi",
    },

    /** Field Validation Rules */
    VALIDATION: {
      LIST: "/v1/rules/validation",
      GET: (id: string) => `/v1/rules/validation/${id}`,
      BY_MODULE: (module: string) => `/v1/rules/validation/modules/${module}`,
      BY_ENTITY: (entity: string) => `/v1/rules/validation/entities/${entity}`,
      VALIDATE: "/v1/rules/validation/validate",
    },

    /** Rule Testing */
    TESTING: {
      RUN_TEST: "/v1/rules/testing/run",
      TEST_SUITES: "/v1/rules/testing/suites",
      TEST_SUITE_GET: (id: string) => `/v1/rules/testing/suites/${id}`,
      TEST_RESULTS: "/v1/rules/testing/results",
    },
  },
} as const;

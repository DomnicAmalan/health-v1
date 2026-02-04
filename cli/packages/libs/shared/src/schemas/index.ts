/**
 * Schemas Index
 *
 * Central export for all Zod schemas, type guards, and assertions.
 */

// ============================================================================
// Utilities
// ============================================================================

export {
  formatZodError,
  createAssertion,
  createTypeGuard,
  parseWithFallback,
  validateArray,
} from './guards';

// ============================================================================
// Common Primitives
// ============================================================================

export {
  // Branded types
  UuidSchema,
  EmailSchema,
  PhoneNumberSchema,
  SSNSchema,
  MRNSchema,
  type Uuid,
  type Email,
  type PhoneNumber,
  type SSN,
  type MRN,

  // Date/Time
  DateStringSchema,
  DateTimeSchema,
  DateObjectSchema,

  // Currency
  CurrencySchema,
  PercentageSchema,
  TaxRateSchema,

  // Text
  NonEmptyStringSchema,
  NameSchema,
  UrlSchema,

  // Address
  ZipCodeSchema,
  StateCodeSchema,
  AddressSchema,
  type Address,

  // Pagination
  PaginationParamsSchema,
  type PaginationParams,
  createPaginatedResponseSchema,

  // Utilities
  nullable,
  optional,
  JsonValueSchema,
} from './common';

// ============================================================================
// Environment
// ============================================================================

export {
  ViteEnvSchema,
  VaultEnvSchema,
  type ViteEnv,
  type VaultEnv,
  validateViteEnv,
  validateVaultEnv,
  getEnvVar,
  isDevelopment,
  isProduction,
  isTest,
} from './env';

// ============================================================================
// API Types
// ============================================================================

export {
  ApiErrorSchema,
  SuccessResponseSchema,
  ErrorResponseSchema,
  ApiResponseSchema,
  type ApiError,
  type ApiResponse,
  isSuccessResponse,
  isErrorResponse,
  isApiError,
  createPaginatedApiResponseSchema,
  RequestConfigSchema,
  type RequestConfig,
  SuccessMessageSchema,
  IdResponseSchema,
  CountResponseSchema,
  type SuccessMessage,
  type IdResponse,
  type CountResponse,
  isSuccessMessage,
  isIdResponse,
  isCountResponse,
  HttpStatusSchema,
  SuccessStatusSchema,
  ClientErrorStatusSchema,
  ServerErrorStatusSchema,
  isSuccessStatus,
  isClientError,
  isServerError,
} from './api/types';

// ============================================================================
// Authentication
// ============================================================================

export {
  LoginRequestSchema,
  LoginResponseSchema,
  type LoginRequest,
  type LoginResponse,
  isLoginRequest,
  isLoginResponse,
  assertLoginRequest,
  assertLoginResponse,
  RefreshTokenRequestSchema,
  RefreshTokenResponseSchema,
  type RefreshTokenRequest,
  type RefreshTokenResponse,
  isRefreshTokenRequest,
  isRefreshTokenResponse,
  assertRefreshTokenRequest,
  assertRefreshTokenResponse,
  UserInfoSchema as AuthUserInfoSchema,
  type UserInfo as AuthUserInfo,
  isUserInfo as isAuthUserInfo,
  assertUserInfo as assertAuthUserInfo,
  LogoutResponseSchema,
  type LogoutResponse,
  isLogoutResponse,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  type PasswordResetRequest,
  type PasswordResetConfirm,
  isPasswordResetRequest,
  isPasswordResetConfirm,
  SessionDataSchema,
  type SessionData,
  isSessionData,
  assertSessionData,
  isSessionValid,
  getSessionTimeRemaining,
} from './api/auth';

// ============================================================================
// Audit
// ============================================================================

export {
  AuditEntrySchema,
  type AuditEntry,
  isAuditEntry,
  assertAuditEntry,
  AuditActionSchema,
  type AuditAction,
  AuditResourceSchema,
  type AuditResource,
  CreateAuditEntryRequestSchema,
  type CreateAuditEntryRequest,
  isCreateAuditEntryRequest,
  assertCreateAuditEntryRequest,
  AuditQueryParamsSchema,
  type AuditQueryParams,
  isAuditQueryParams,
  isPHIAccess,
  isWithinRetentionPeriod,
  getAuditEntryAge,
} from './audit';

// ============================================================================
// User
// ============================================================================

export {
  UserSchema,
  type User,
  isUser,
  assertUser,
  UserInfoSchema,
  type UserInfo,
  isUserInfo,
  assertUserInfo,
  UserRoleSchema,
  type UserRole,
  hasRole,
  hasAnyRole,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from './user';

// ============================================================================
// EHR - Patient
// ============================================================================

export {
  EhrGenderSchema,
  type EhrGender,
  EhrPatientStatusSchema,
  type EhrPatientStatus,
  MRNSchema as PatientMRNSchema,
  SSNLastFourSchema,
  EhrPatientSchema,
  type EhrPatient,
  isEhrPatient,
  assertEhrPatient,
  CreateEhrPatientRequestSchema,
  type CreateEhrPatientRequest,
  isCreateEhrPatientRequest,
  assertCreateEhrPatientRequest,
  UpdateEhrPatientRequestSchema,
  type UpdateEhrPatientRequest,
  isUpdateEhrPatientRequest,
  assertUpdateEhrPatientRequest,
  EhrPatientSearchCriteriaSchema,
  type EhrPatientSearchCriteria,
  isEhrPatientSearchCriteria,
  EhrPatientBannerSchema,
  type EhrPatientBanner,
  isEhrPatientBanner,
  assertEhrPatientBanner,
  hasInsurance,
  getPatientFullName,
  calculatePatientAge,
  isPatientDeceased,
  isPatientActive,
} from './ehr/patient';

/**
 * Shared API Types and Constants
 */

// Export base client first (defines core types)
export * from "./baseClient";
export * from "./config";
export * from "./createApiClient";
// Export routes and config
export * from "./routes";

// Export additional types (auth-related, service types, etc.)
export type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ServiceInfo,
  ServiceStatusResponse,
  SetupRequest,
  SetupStatusResponse,
} from "./types";

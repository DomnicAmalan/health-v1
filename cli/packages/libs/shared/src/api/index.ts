/**
 * Shared API Types and Constants
 */

// Export base client first (defines core types)
export * from "./baseClient";

// Export routes and config
export * from "./routes";
export * from "./config";

// Export additional types (auth-related, service types, etc.)
export {
  type LoginRequest,
  type LoginResponse,
  type RefreshTokenRequest,
  type RefreshTokenResponse,
  type SetupRequest,
  type SetupStatusResponse,
  type ServiceInfo,
  type ServiceStatusResponse,
} from "./types";

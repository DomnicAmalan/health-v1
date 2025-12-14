/**
 * API Types
 * Re-export from shared package
 */

export type {
  ApiError,
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserInfo,
  ServiceInfo,
  ServiceStatusResponse,
} from "@lazarus-life/shared/api/types";

export type { User } from "@lazarus-life/shared/types/user";
export type { Patient } from "@lazarus-life/shared/types/patient";
export type { AuditEntry } from "@lazarus-life/shared/types/audit";
export type { HttpMethod, RequestConfig } from "@lazarus-life/shared/types/common";

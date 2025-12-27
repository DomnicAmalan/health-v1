/**
 * Consolidated API Types
 * All API request and response types used across the application
 */

import type { User } from "../types/user";

// Re-export base client types for convenience
export type {
  ApiError,
  ApiResponse,
  AuthConfig,
  AuthErrorHandler,
  AuthProvider,
  AuthType,
  BaseClientConfig,
  ErrorInterceptor,
  HttpMethod,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ResponseTransformer,
} from "./baseClient";

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
  /** Session token for cookie-based auth (web apps) */
  sessionToken?: string;
  /** Organization ID for this session */
  organizationId?: string;
  /** Vault Realm ID for this organization (used for on-demand vault token minting) */
  realmId?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Setup types
export interface SetupRequest {
  organization_name: string;
  organization_slug: string;
  organization_domain?: string;
  admin_email: string;
  admin_username: string;
  admin_password: string;
}

export interface SetupStatusResponse {
  setup_completed: boolean;
  setup_completed_at?: string;
  setup_completed_by?: string;
}

// Service types
export interface ServiceInfo {
  name: string;
  enabled: boolean;
  operational: boolean;
  healthEndpoint?: string;
  lastChecked?: string;
  error?: string;
}

export interface ServiceStatusResponse {
  services: ServiceInfo[];
  overallStatus: string; // "operational", "degraded", "down", "unknown"
  checkedAt: string;
}

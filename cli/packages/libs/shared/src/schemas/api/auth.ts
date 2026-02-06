/**
 * Authentication API Schemas
 *
 * Schemas for login, token refresh, user info, and auth-related API calls.
 */

import { z } from "zod";
import { EmailSchema } from "../common";
import { createTypeGuard, createAssertion } from "../guards";

// ============================================================================
// Login Schemas
// ============================================================================

/**
 * Login request schema
 */
export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Login response schema
 */
export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresIn: z.number().int().positive(),
  tokenType: z.string().default('Bearer'),
  user: z.object({
    id: z.string(),
    email: EmailSchema,
    firstName: z.string(),
    lastName: z.string(),
    role: z.string(),
  }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// Type guards
export const isLoginRequest = createTypeGuard(LoginRequestSchema);
export const isLoginResponse = createTypeGuard(LoginResponseSchema);

// Assertions
export const assertLoginRequest = createAssertion(LoginRequestSchema, 'LoginRequest');
export const assertLoginResponse = createAssertion(LoginResponseSchema, 'LoginResponse');

// ============================================================================
// Token Refresh Schemas
// ============================================================================

/**
 * Token refresh request schema
 */
export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

/**
 * Token refresh response schema
 */
export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  tokenType: z.string().default('Bearer'),
});

export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

// Type guards
export const isRefreshTokenRequest = createTypeGuard(RefreshTokenRequestSchema);
export const isRefreshTokenResponse = createTypeGuard(RefreshTokenResponseSchema);

// Assertions
export const assertRefreshTokenRequest = createAssertion(RefreshTokenRequestSchema, 'RefreshTokenRequest');
export const assertRefreshTokenResponse = createAssertion(RefreshTokenResponseSchema, 'RefreshTokenResponse');

// ============================================================================
// User Info Schemas
// ============================================================================

/**
 * User info schema (from JWT or /me endpoint)
 */
export const UserInfoSchema = z.object({
  id: z.string(),
  email: EmailSchema,
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

// Type guards
export const isUserInfo = createTypeGuard(UserInfoSchema);

// Assertions
export const assertUserInfo = createAssertion(UserInfoSchema, 'UserInfo');

// ============================================================================
// Logout Schemas
// ============================================================================

/**
 * Logout response schema
 */
export const LogoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

// Type guards
export const isLogoutResponse = createTypeGuard(LogoutResponseSchema);

// Assertions
export const assertLogoutResponse = createAssertion(LogoutResponseSchema, 'LogoutResponse');

// ============================================================================
// Password Reset Schemas
// ============================================================================

/**
 * Password reset request schema
 */
export const PasswordResetRequestSchema = z.object({
  email: EmailSchema,
});

export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;

/**
 * Password reset confirmation schema
 */
export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(8),
}).refine(
  data => data.newPassword === data.confirmPassword,
  { message: "Passwords do not match", path: ['confirmPassword'] }
);

export type PasswordResetConfirm = z.infer<typeof PasswordResetConfirmSchema>;

// Type guards
export const isPasswordResetRequest = createTypeGuard(PasswordResetRequestSchema);
export const isPasswordResetConfirm = createTypeGuard(PasswordResetConfirmSchema);

// ============================================================================
// Session Schemas
// ============================================================================

/**
 * Session data schema (stored in sessionStorage)
 */
export const SessionDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().int().positive(),
  user: UserInfoSchema,
  createdAt: z.number().int().positive(),
});

export type SessionData = z.infer<typeof SessionDataSchema>;

// Type guards
export const isSessionData = createTypeGuard(SessionDataSchema);

// Assertions
export const assertSessionData = createAssertion(SessionDataSchema, 'SessionData');

/**
 * Validate session is not expired
 */
export function isSessionValid(session: SessionData): boolean {
  return session.expiresAt > Date.now();
}

/**
 * Get session time remaining in milliseconds
 */
export function getSessionTimeRemaining(session: SessionData): number {
  return Math.max(0, session.expiresAt - Date.now());
}

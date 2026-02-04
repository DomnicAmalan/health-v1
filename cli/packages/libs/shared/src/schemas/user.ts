/**
 * User Schemas
 *
 * Runtime validation schemas for User and UserInfo types.
 * Single source of truth - use z.infer<> for types.
 */

import { z } from "zod";
import { EmailSchema } from "./common";
import { createTypeGuard, createAssertion } from "./guards";

// ============================================================================
// User Schema
// ============================================================================

/**
 * User schema - full user record
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: EmailSchema,
  username: z.string().optional(),
  role: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.string().datetime().optional(),
});

export type User = z.infer<typeof UserSchema>;

// Type guards
export const isUser = createTypeGuard(UserSchema);

// Assertions
export const assertUser = createAssertion(UserSchema, 'User');

// ============================================================================
// UserInfo Schema
// ============================================================================

/**
 * UserInfo schema (JWT claims / /me endpoint)
 */
export const UserInfoSchema = z.object({
  sub: z.string(),
  email: EmailSchema,
  name: z.string().optional(),
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
  realmId: z.string().optional(),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

// Type guards
export const isUserInfo = createTypeGuard(UserInfoSchema);

// Assertions
export const assertUserInfo = createAssertion(UserInfoSchema, 'UserInfo');

// ============================================================================
// User Role Validation
// ============================================================================

/**
 * Common user roles
 */
export const UserRoleSchema = z.enum([
  'admin',
  'user',
  'guest',
  'provider',
  'nurse',
  'receptionist',
  'billing',
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * Check if user has specific role
 */
export function hasRole(user: User | UserInfo, role: UserRole): boolean {
  return user.role === role;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: User | UserInfo, roles: UserRole[]): boolean {
  return roles.includes(user.role as UserRole);
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: User | UserInfo, permission: string): boolean {
  if ('permissions' in user && Array.isArray(user.permissions)) {
    return user.permissions.includes(permission);
  }
  return false;
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: User | UserInfo, permissions: string[]): boolean {
  if ('permissions' in user && Array.isArray(user.permissions)) {
    return permissions.every(p => user.permissions!.includes(p));
  }
  return false;
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: User | UserInfo, permissions: string[]): boolean {
  if ('permissions' in user && Array.isArray(user.permissions)) {
    return permissions.some(p => user.permissions!.includes(p));
  }
  return false;
}

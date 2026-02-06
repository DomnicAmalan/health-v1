/**
 * Audit Log Schemas
 *
 * Runtime validation schemas for audit logging and compliance tracking.
 * Supports HIPAA 7-year retention requirements and PHI access tracking.
 */

import { z } from "zod";
import { createTypeGuard, createAssertion } from "./guards";

// ============================================================================
// Audit Entry Schema
// ============================================================================

/**
 * Audit entry schema for logging user actions
 */
export const AuditEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.string().min(1, { message: "Action is required" }),
  resource: z.string().min(1, { message: "Resource is required" }),
  resourceId: z.string().optional(),
  timestamp: z.string().datetime(),
  details: z.record(z.string(), z.unknown()).optional(),
  masked: z.boolean(),
});

export type AuditEntry = z.infer<typeof AuditEntrySchema>;

// Type guards
export const isAuditEntry = createTypeGuard(AuditEntrySchema);

// Assertions
export const assertAuditEntry = createAssertion(AuditEntrySchema, 'AuditEntry');

// ============================================================================
// Audit Action Types
// ============================================================================

/**
 * Standard audit actions
 */
export const AuditActionSchema = z.enum([
  'create',
  'read',
  'update',
  'delete',
  'login',
  'logout',
  'access',
  'export',
  'print',
  'share',
  'decrypt',
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

// ============================================================================
// Audit Resource Types
// ============================================================================

/**
 * Resources that can be audited
 */
export const AuditResourceSchema = z.enum([
  'patient',
  'appointment',
  'medication',
  'lab_result',
  'vital',
  'allergy',
  'problem',
  'document',
  'user',
  'role',
  'permission',
  'system',
]);

export type AuditResource = z.infer<typeof AuditResourceSchema>;

// ============================================================================
// Create Audit Entry Request
// ============================================================================

/**
 * Request to create an audit entry
 */
export const CreateAuditEntryRequestSchema = z.object({
  userId: z.string().uuid(),
  action: z.string().min(1),
  resource: z.string().min(1),
  resourceId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  masked: z.boolean().default(false),
});

export type CreateAuditEntryRequest = z.infer<typeof CreateAuditEntryRequestSchema>;

// Type guards
export const isCreateAuditEntryRequest = createTypeGuard(CreateAuditEntryRequestSchema);

// Assertions
export const assertCreateAuditEntryRequest = createAssertion(
  CreateAuditEntryRequestSchema,
  'CreateAuditEntryRequest'
);

// ============================================================================
// Audit Query Parameters
// ============================================================================

/**
 * Parameters for querying audit logs
 */
export const AuditQueryParamsSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type AuditQueryParams = z.infer<typeof AuditQueryParamsSchema>;

// Type guards
export const isAuditQueryParams = createTypeGuard(AuditQueryParamsSchema);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an audit entry contains PHI access
 */
export function isPHIAccess(entry: AuditEntry): boolean {
  const phiResources: AuditResource[] = [
    'patient',
    'appointment',
    'medication',
    'lab_result',
    'vital',
    'allergy',
    'problem',
    'document',
  ];
  return phiResources.includes(entry.resource as AuditResource);
}

/**
 * Check if an audit entry is within HIPAA retention period (7 years)
 */
export function isWithinRetentionPeriod(entry: AuditEntry): boolean {
  const retentionDays = 2555; // 7 years
  const timestamp = new Date(entry.timestamp);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff <= retentionDays;
}

/**
 * Get audit entry age in days
 */
export function getAuditEntryAge(entry: AuditEntry): number {
  const timestamp = new Date(entry.timestamp);
  const now = new Date();
  return Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24));
}

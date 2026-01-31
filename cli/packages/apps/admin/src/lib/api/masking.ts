/**
 * Masking Utilities for Admin App
 * Frontend masking utilities for PII/PHI protection
 * Supports complete, partial, and contextual masking
 */

import type { MaskingLevel } from "@lazarus-life/shared/constants/security";

export interface MaskingConfig {
  level: MaskingLevel;
  visibleChars?: number;
  maskChar?: string;
  format?: string;
}

/**
 * Mask a field value with specified configuration
 */
export function maskField(value: string, visibleChars: number, maskChar = "*"): string {
  if (!value || value.length <= visibleChars) {
    return value;
  }

  const visible = value.slice(-visibleChars);
  const maskedLen = value.length - visibleChars;
  const masked = maskChar.repeat(maskedLen);

  return `${masked}${visible}`;
}

/**
 * Mask SSN (Social Security Number)
 * Format: ***-**-1234
 */
export function maskSSN(value: string, level: MaskingLevel = "partial"): string {
  if (!value) {
    return "";
  }

  if (level === "complete") {
    return "[REDACTED]";
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length === 9) {
    const lastFour = digits.slice(-4);
    return `***-**-${lastFour}`;
  }

  return maskField(value, 0);
}

/**
 * Mask email address
 * Format: **st@example.com
 */
export function maskEmail(value: string, level: MaskingLevel = "partial"): string {
  if (!value) {
    return "";
  }

  if (level === "complete") {
    return "[REDACTED]";
  }

  const atPos = value.indexOf("@");
  if (atPos === -1) {
    return maskField(value, 2);
  }

  const local = value.slice(0, atPos);
  const domain = value.slice(atPos);
  const visible = local.slice(-2);
  const maskedLocal = "*".repeat(Math.max(0, local.length - 2));

  return `${maskedLocal}${visible}${domain}`;
}

/**
 * Mask phone number
 * Format: ***-***-7890
 */
export function maskPhone(value: string, level: MaskingLevel = "partial"): string {
  if (!value) {
    return "";
  }

  if (level === "complete") {
    return "[REDACTED]";
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length >= 4) {
    const lastFour = digits.slice(-4);
    return `***-***-${lastFour}`;
  }

  return maskField(value, 0);
}

/**
 * Contextual masking based on field type and user role
 */
export function contextualMask(value: string, field: string, userRole: string): string {
  // Get masking level based on user role
  const level = getMaskingLevel(field, userRole);

  // Apply appropriate masker
  switch (field.toLowerCase()) {
    case "ssn":
      return maskSSN(value, level);
    case "email":
      return maskEmail(value, level);
    case "phone":
      return maskPhone(value, level);
    default:
      // Default to partial masking
      return maskField(value, 4);
  }
}

/**
 * Get masking level based on user role
 * Admin users get partial masking, others get complete masking
 */
function getMaskingLevel(_field: string, userRole: string): MaskingLevel {
  switch (userRole.toLowerCase()) {
    case "admin":
    case "superadmin":
      return "partial"; // Admin can see partial PII
    default:
      return "complete"; // Default to most secure
  }
}

/**
 * Mask an object's sensitive fields
 */
export function maskObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToMask: string[],
  userRole = "user"
): T {
  const masked: Record<string, unknown> = { ...obj };

  for (const field of fieldsToMask) {
    if (field in masked && typeof masked[field] === "string") {
      masked[field] = contextualMask(String(masked[field]), field, userRole);
    }
  }

  return masked as T;
}

/**
 * Sanitize error messages to remove potential PII/PHI
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove email patterns
  let sanitized = message.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    "[EMAIL]"
  );

  // Remove SSN patterns (XXX-XX-XXXX or XXXXXXXXX)
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]");
  sanitized = sanitized.replace(/\b\d{9}\b/g, "[SSN]");

  // Remove phone patterns (XXX-XXX-XXXX, (XXX) XXX-XXXX, etc.)
  sanitized = sanitized.replace(/\b\d{3}-\d{3}-\d{4}\b/g, "[PHONE]");
  sanitized = sanitized.replace(/\(\d{3}\)\s*\d{3}-\d{4}/g, "[PHONE]");

  // Remove user IDs (UUID patterns)
  sanitized = sanitized.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    "[ID]"
  );

  return sanitized;
}

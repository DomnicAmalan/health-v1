/**
 * Masking Utilities Tests
 * Tests for PII/PHI masking functions
 */

import { describe, it, expect } from "vitest";
import {
  maskEmail,
  maskField,
  maskPhone,
  maskSSN,
  maskObject,
  sanitizeErrorMessage,
} from "./masking";

describe("Masking Utilities", () => {
  describe("maskField", () => {
    it("should mask field with specified visible characters", () => {
      const result = maskField("1234567890", 4);
      expect(result).toBe("******7890");
    });

    it("should return original value if shorter than visible chars", () => {
      const result = maskField("123", 4);
      expect(result).toBe("123");
    });

    it("should use custom mask character", () => {
      const result = maskField("1234567890", 4, "#");
      expect(result).toBe("######7890");
    });
  });

  describe("maskSSN", () => {
    it("should mask SSN with partial masking", () => {
      const result = maskSSN("123-45-6789", "partial");
      expect(result).toBe("***-**-6789");
    });

    it("should completely mask SSN", () => {
      const result = maskSSN("123-45-6789", "complete");
      expect(result).toBe("[REDACTED]");
    });

    it("should handle SSN without dashes", () => {
      const result = maskSSN("123456789", "partial");
      expect(result).toBe("***-**-6789");
    });

    it("should handle empty SSN", () => {
      const result = maskSSN("");
      expect(result).toBe("");
    });
  });

  describe("maskEmail", () => {
    it("should mask email with partial masking", () => {
      const result = maskEmail("test@example.com", "partial");
      expect(result).toBe("**st@example.com");
    });

    it("should mask long email addresses", () => {
      const result = maskEmail("verylongemail@example.com", "partial");
      expect(result).toBe("*************il@example.com");
    });

    it("should completely mask email", () => {
      const result = maskEmail("test@example.com", "complete");
      expect(result).toBe("[REDACTED]");
    });

    it("should handle email without @ symbol", () => {
      const result = maskEmail("notanemail", "partial");
      expect(result).toBe("******em**");
    });

    it("should handle empty email", () => {
      const result = maskEmail("");
      expect(result).toBe("");
    });
  });

  describe("maskPhone", () => {
    it("should mask phone with partial masking", () => {
      const result = maskPhone("555-123-4567", "partial");
      expect(result).toBe("***-***-4567");
    });

    it("should completely mask phone", () => {
      const result = maskPhone("555-123-4567", "complete");
      expect(result).toBe("[REDACTED]");
    });

    it("should handle phone without dashes", () => {
      const result = maskPhone("5551234567", "partial");
      expect(result).toBe("***-***-4567");
    });

    it("should handle phone with parentheses", () => {
      const result = maskPhone("(555) 123-4567", "partial");
      expect(result).toBe("***-***-4567");
    });

    it("should handle empty phone", () => {
      const result = maskPhone("");
      expect(result).toBe("");
    });
  });

  describe("maskObject", () => {
    it("should mask specified fields in object", () => {
      const obj = {
        email: "test@example.com",
        ssn: "123-45-6789",
        phone: "555-123-4567",
        name: "John Doe",
      };

      const masked = maskObject(obj, ["email", "ssn", "phone"], "admin");

      expect(masked.email).toBe("**st@example.com");
      expect(masked.ssn).toBe("***-**-6789");
      expect(masked.phone).toBe("***-***-4567");
      expect(masked.name).toBe("John Doe"); // Not masked
    });

    it("should use complete masking for non-admin roles", () => {
      const obj = {
        email: "test@example.com",
        ssn: "123-45-6789",
      };

      const masked = maskObject(obj, ["email", "ssn"], "user");

      expect(masked.email).toBe("[REDACTED]");
      expect(masked.ssn).toBe("[REDACTED]");
    });

    it("should handle empty object", () => {
      const masked = maskObject({}, ["email", "ssn"]);
      expect(masked).toEqual({});
    });

    it("should preserve non-string fields", () => {
      const obj = {
        email: "test@example.com",
        count: 42,
        active: true,
      };

      const masked = maskObject(obj, ["email"], "admin");

      expect(masked.email).toBe("**st@example.com");
      expect(masked.count).toBe(42);
      expect(masked.active).toBe(true);
    });
  });

  describe("sanitizeErrorMessage", () => {
    it("should remove email from error messages", () => {
      const message = "User test@example.com not found";
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toBe("User [EMAIL] not found");
    });

    it("should remove SSN patterns", () => {
      const message = "SSN 123-45-6789 is invalid";
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toBe("SSN [SSN] is invalid");
    });

    it("should remove SSN without dashes", () => {
      const message = "SSN 123456789 is invalid";
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toBe("SSN [SSN] is invalid");
    });

    it("should remove phone numbers", () => {
      const message = "Call 555-123-4567 for support";
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toBe("Call [PHONE] for support");
    });

    it("should remove phone with parentheses", () => {
      const message = "Call (555) 123-4567 for support";
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toBe("Call [PHONE] for support");
    });

    it("should remove UUIDs", () => {
      const message = "User 550e8400-e29b-41d4-a716-446655440000 not found";
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toBe("User [ID] not found");
    });

    it("should handle multiple patterns in one message", () => {
      const message = "User test@example.com with SSN 123-45-6789 and phone 555-123-4567 not found";
      const sanitized = sanitizeErrorMessage(message);
      expect(sanitized).toBe("User [EMAIL] with SSN [SSN] and phone [PHONE] not found");
    });

    it("should handle empty message", () => {
      const sanitized = sanitizeErrorMessage("");
      expect(sanitized).toBe("");
    });
  });
});

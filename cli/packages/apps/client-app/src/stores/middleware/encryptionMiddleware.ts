/**
 * Encryption Middleware
 * Encrypts sensitive fields in state before storing
 * Note: In a real implementation, this would use the encryption service
 */

import type { StateCreator } from "zustand";

// Note: Encryption functionality is currently disabled
// Fields that should be encrypted in state (for future use)
// const ENCRYPTED_FIELDS = ["ssn", "creditCard", "password", "token", "secret"];

// Note: Encryption functions are commented out as they're not currently used
// but may be needed in the future for production implementation
// Uncomment and implement when ready to use encryption middleware

// /**
//  * Check if a field name should be encrypted
//  */
// function _shouldEncryptField(fieldName: string): boolean {
//   return ENCRYPTED_FIELDS.some((encryptedField) =>
//     fieldName.toLowerCase().includes(encryptedField.toLowerCase())
//   );
// }

// /**
//  * Encrypt a value (placeholder - in production, use actual encryption)
//  */
// async function _encryptValue(value: unknown): Promise<string> {
//   // In production, this would call the encryption service
//   // For now, we'll just return a placeholder
//   if (typeof value === "string") {
//     // In a real implementation, this would encrypt the value
//     // return await encryptionService.encrypt(value);
//     return value; // Placeholder - actual encryption would happen here
//   }
//   return String(value);
// }

// /**
//  * Decrypt a value (placeholder - in production, use actual decryption)
//  */
// async function _decryptValue(encryptedValue: string): Promise<string> {
//   // In production, this would call the decryption service
//   // For now, we'll just return the value as-is
//   // return await encryptionService.decrypt(encryptedValue);
//   return encryptedValue; // Placeholder - actual decryption would happen here
// }

// /**
//  * Encrypt sensitive fields in an object
//  */
// async function _encryptObject(obj: unknown): Promise<unknown> {
//   if (!obj || typeof obj !== "object") return obj;

//   if (Array.isArray(obj)) {
//     return Promise.all(obj.map((item) => _encryptObject(item)));
//   }

//   const encrypted: Record<string, unknown> = {};

//   for (const [key, value] of Object.entries(obj)) {
//     if (_shouldEncryptField(key) && typeof value === "string") {
//       encrypted[key] = await _encryptValue(value);
//       encrypted[`${key}_encrypted`] = true; // Flag to indicate encryption
//     } else if (typeof value === "object" && value !== null) {
//       encrypted[key] = await _encryptObject(value);
//     } else {
//       encrypted[key] = value;
//     }
//   }

//   return encrypted;
// }

/**
 * Encryption middleware that encrypts sensitive fields before storing
 * Note: This is a placeholder implementation. In production, you would:
 * 1. Use actual encryption service
 * 2. Handle async encryption/decryption properly
 * 3. Store encryption metadata
 */
export function encryptionMiddleware<T>(config: StateCreator<T>): StateCreator<T> {
  return (set, get, api) => {
    // Wrap set function to encrypt sensitive data
    // Note: In a real implementation, encryption would be async, but zustand's set is synchronous
    // This is a placeholder that would need to be refactored for production use
    const setWithEncryption = (
      partial: T | Partial<T> | ((state: T) => T | Partial<T>),
      replace?: boolean | undefined
    ) => {
      // For now, we'll just pass through without encryption
      // In production, you would need to handle async encryption differently
      // (e.g., encrypt before calling set, or use a different pattern)

      // Call original set - handle replace parameter correctly
      if (replace === true) {
        // When replace is true, partial must be T (full state)
        if (typeof partial === "function" && partial.prototype === undefined) {
          const currentState = get();
          const fullState = (partial as (state: T) => T)(currentState);
          return set(fullState, true);
        }
        return set(partial as T, true);
      }
      // When replace is false or undefined, partial can be Partial<T>
      return set(partial, false);
    };

    // Note: In a real implementation, you'd also need to decrypt when reading
    // This would require wrapping the get function as well

    return config(setWithEncryption, get, api);
  };
}

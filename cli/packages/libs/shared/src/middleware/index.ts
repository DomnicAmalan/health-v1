/**
 * Zustand Middleware
 * Shared middleware for Zustand stores across all apps
 */

export {
  createAuditMiddleware,
  type AuditMiddlewareConfig,
  type AuditLogEntry,
} from "./auditMiddleware";

export {
  createValidationMiddleware,
  type ValidationMiddlewareConfig,
  type StoreValidationError,
  type FieldValidationRule,
} from "./validationMiddleware";

export {
  createPersistenceMiddleware,
  clearPersistedState,
  type PersistenceMiddlewareConfig,
  type StorageType,
} from "./persistenceMiddleware";

/**
 * Types index
 * Re-export all domain types, component types, and store types
 *
 * NOTE: Migrated types now re-exported from schemas for runtime validation
 */

export * from "./assert";
// Migrated to schemas
export * from "../schemas/audit";
export * from "./billing";
export * from "./common";
export * from "./compliance";
export * from "./dashboard";
export * from "./departments";
export * from "./diagnostics";
export * from "./components";
export * from "./ehr";
export * from "./i18n";
// patient is exported from ehr
export * from "./rules";
export * from "./stores";
// Migrated to schemas
export * from "../schemas/user";
export * from "./workflow";

/**
 * EHR (Electronic Health Record) Types
 * VistA-inspired EHR system types
 *
 * NOTE: Migrated types now re-exported from schemas for runtime validation
 */

// Migrated to Zod schemas - re-export from schemas
export * from "../../schemas/ehr/patient";
export * from "../../schemas/ehr/visit";
export * from "../../schemas/ehr/problem";
export * from "../../schemas/ehr/medication";
export * from "../../schemas/ehr/allergy";
export * from "../../schemas/ehr/vital";
export * from "../../schemas/ehr/lab-result";
export * from "../../schemas/ehr/order";
export * from "../../schemas/ehr/appointment";

// Not yet migrated - still from types
export * from "./document";
export * from "./prescription";
export * from "./pharmacy";
export * from "./inventory";
export * from "./common";

/**
 * Billing Types
 * International, jurisdiction-agnostic billing system for healthcare
 *
 * NOTE: Migrated types now re-exported from schemas for runtime validation
 */

// Migrated to Zod schemas - re-export from schemas
export * from "../../schemas/billing/invoice";
export * from "../../schemas/billing/payment";

// Not yet migrated - still from types
export * from "./service";
export * from "./insurance";
export * from "./tax";

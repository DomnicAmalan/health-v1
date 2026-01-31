export * from "./auth";
export * from "./client";
export * from "./policies";
export * from "./realms";
export * from "./secrets";
export * from "./system";
export * from "./tokens";
export * from "./users";

// Re-export shared routes for convenience
import { API_ROUTES } from "@lazarus-life/shared/api";
export { API_ROUTES };
export const VAULT_ROUTES = API_ROUTES.VAULT_DIRECT;

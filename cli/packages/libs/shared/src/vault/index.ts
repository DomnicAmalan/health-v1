/**
 * Lazarus Life Vault Integration for all Lazarus Life UIs
 *
 * This module provides unified secrets access and ACL checking
 * across admin, client, and vault UIs.
 *
 * Key features:
 * - Vault proxy client for backend-mediated vault access (recommended)
 * - Direct vault client for admin UIs only
 * - Zustand store for vault state
 * - React hooks for vault operations
 * - Permission mappings (health-v1 → vault paths)
 * - Zanzibar-Vault sync for realm policies
 *
 * IMPORTANT: Client apps should use VaultProxyClient (backend-mediated).
 * Only admin/vault UIs should use the direct VaultClient.
 */

// Direct vault access (for admin/vault UIs only)
export * from "./client";
export * from "./components";
export * from "./hooks";
export * from "./permissions";
// Recommended: Backend-mediated vault access (for client apps)
export * from "./proxy";
export * from "./store";
export * from "./sync";
export * from "./types";

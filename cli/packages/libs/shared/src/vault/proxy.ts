/**
 * Vault Proxy Client
 *
 * This client talks to the health-v1 backend which proxies vault requests.
 * Client apps should NEVER talk directly to Vault - all requests go through
 * the backend for:
 * - Security: Never expose vault tokens/credentials to frontend
 * - Audit: All access is logged through health-v1
 * - Policy: Backend enforces role-based policies
 *
 * Usage:
 * ```typescript
 * import { vaultProxy } from '@lazarus-life/shared/vault';
 *
 * // Request an on-demand vault token (for operations that need it)
 * const { token, ttl, policies } = await vaultProxy.requestToken();
 *
 * // Read a secret (proxied through backend)
 * const secret = await vaultProxy.readSecret('app/config');
 *
 * // Check capabilities
 * const caps = await vaultProxy.checkCapabilities(['secret/data/patients/*']);
 * ```
 */

import { API_ROUTES } from "../api/routes";

export interface VaultTokenRequest {
  /** Optional specific policies to request (must be subset of user's allowed policies) */
  policies?: string[];
  /** Optional TTL in seconds (max 900 = 15 minutes) */
  ttl?: number;
}

export interface VaultTokenResponse {
  /** The vault token (short-lived) */
  token: string;
  /** Time-to-live in seconds */
  ttl: number;
  /** Policies attached to the token */
  policies: string[];
  /** The realm ID this token is scoped to */
  realmId: string;
  /** Token accessor (for revocation without knowing the token) */
  accessor: string;
}

export interface VaultSecretResponse<T = Record<string, unknown>> {
  data: T;
  metadata?: {
    version?: number;
    createdTime?: string;
    deletionTime?: string;
  };
}

export interface VaultProxyCapabilitiesResponse {
  capabilities: Record<string, string[]>;
  realmId: string;
}

export interface VaultProxyConfig {
  /** Base URL for the health-v1 API (defaults to window.location.origin) */
  baseUrl?: string;
  /** Function to get the current auth token */
  getAuthToken: () => string | null;
  /** Optional error handler */
  onError?: (error: VaultProxyError) => void;
}

export class VaultProxyError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number
  ) {
    super(message);
    this.name = "VaultProxyError";
  }
}

/**
 * Vault Proxy Client
 * All vault operations are proxied through the health-v1 backend
 */
export class VaultProxyClient {
  private baseUrl: string;
  private getAuthToken: () => string | null;
  private onError?: (error: VaultProxyError) => void;

  constructor(config: VaultProxyConfig) {
    this.baseUrl = (
      config.baseUrl ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:4117")
    ).replace(/\/$/, "");
    this.getAuthToken = config.getAuthToken;
    this.onError = config.onError;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new VaultProxyError(
        data.error || `HTTP ${response.status}`,
        data.code || "UNKNOWN_ERROR",
        response.status
      );
      this.onError?.(error);
      throw error;
    }

    return data as T;
  }

  // ============================================
  // On-Demand Token Minting
  // ============================================

  /**
   * Request an on-demand vault token
   *
   * This token is short-lived (max 15 minutes) and scoped to the user's
   * organization realm and role-based policies.
   *
   * Use this when you need to perform vault operations that require a token.
   * For most operations, use the proxy methods (readSecret, writeSecret, etc.)
   * which don't require a token.
   *
   * @param request Optional request parameters
   * @returns Short-lived vault token with policies
   */
  async requestToken(request?: VaultTokenRequest): Promise<VaultTokenResponse> {
    return this.request<VaultTokenResponse>("POST", API_ROUTES.VAULT.TOKEN, request || {});
  }

  // ============================================
  // Secret Operations (Proxied)
  // ============================================

  /**
   * Read a secret from the vault
   *
   * The path is automatically scoped to the user's organization realm.
   * No vault token is needed - the backend handles authentication.
   *
   * @param path Secret path (e.g., "app/config", "patients/12345")
   * @returns Secret data and metadata
   */
  async readSecret<T = Record<string, unknown>>(path: string): Promise<VaultSecretResponse<T>> {
    return this.request<VaultSecretResponse<T>>("GET", API_ROUTES.VAULT.SECRET(path));
  }

  /**
   * Write a secret to the vault
   *
   * The path is automatically scoped to the user's organization realm.
   * No vault token is needed - the backend handles authentication.
   *
   * @param path Secret path
   * @param data Secret data
   * @returns Success response
   */
  async writeSecret(path: string, data: Record<string, unknown>): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("POST", API_ROUTES.VAULT.SECRET(path), { data });
  }

  /**
   * Delete a secret from the vault
   *
   * The path is automatically scoped to the user's organization realm.
   * No vault token is needed - the backend handles authentication.
   *
   * @param path Secret path
   * @returns Success response
   */
  async deleteSecret(path: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("DELETE", API_ROUTES.VAULT.SECRET(path));
  }

  /**
   * List secrets at a path
   *
   * The path is automatically scoped to the user's organization realm.
   * No vault token is needed - the backend handles authentication.
   *
   * @param path Optional path prefix (defaults to root)
   * @returns List of secret keys
   */
  async listSecrets(path?: string): Promise<{ keys: string[] }> {
    const url = path
      ? `${API_ROUTES.VAULT.SECRETS_LIST}?path=${encodeURIComponent(path)}`
      : API_ROUTES.VAULT.SECRETS_LIST;
    return this.request<{ keys: string[] }>("GET", url);
  }

  // ============================================
  // Capabilities (ACL Checking)
  // ============================================

  /**
   * Check user's capabilities for given paths
   *
   * Returns the capabilities (create, read, update, delete, list) that
   * the user has for each path based on their role and vault policies.
   *
   * @param paths Paths to check capabilities for
   * @returns Capabilities for each path
   */
  async checkCapabilities(paths: string[]): Promise<VaultProxyCapabilitiesResponse> {
    return this.request<VaultProxyCapabilitiesResponse>("POST", API_ROUTES.VAULT.CAPABILITIES, {
      paths,
    });
  }

  /**
   * Check if user has a specific capability for a path
   *
   * @param path Path to check
   * @param capability Capability to check (create, read, update, delete, list)
   * @returns True if user has the capability
   */
  async hasCapability(
    path: string,
    capability: "create" | "read" | "update" | "delete" | "list"
  ): Promise<boolean> {
    const result = await this.checkCapabilities([path]);
    const caps = result.capabilities[path] || [];
    return caps.includes(capability) || caps.includes("root");
  }

  /**
   * Check if user can read a path
   */
  async canRead(path: string): Promise<boolean> {
    return this.hasCapability(path, "read");
  }

  /**
   * Check if user can write to a path
   */
  async canWrite(path: string): Promise<boolean> {
    const result = await this.checkCapabilities([path]);
    const caps = result.capabilities[path] || [];
    return caps.includes("create") || caps.includes("update") || caps.includes("root");
  }

  /**
   * Check if user can delete a path
   */
  async canDelete(path: string): Promise<boolean> {
    return this.hasCapability(path, "delete");
  }

  /**
   * Check if user can list a path
   */
  async canList(path: string): Promise<boolean> {
    return this.hasCapability(path, "list");
  }
}

/**
 * Create a vault proxy client
 *
 * @param config Configuration options
 * @returns VaultProxyClient instance
 */
export function createVaultProxy(config: VaultProxyConfig): VaultProxyClient {
  return new VaultProxyClient(config);
}

/**
 * API Client Factory
 * Creates configured API clients for different authentication strategies
 */

import { BaseApiClient, type BaseClientConfig, type ApiResponse, type ApiError } from "./baseClient";
import { VaultApiError } from "../vault/client";

// ============================================================================
// Configuration Types
// ============================================================================

/** Token-based authentication (JWT with refresh) */
export interface TokenAuthClientConfig {
  strategy: "token";
  baseUrl: string;
  /** Function to get current access token */
  getAccessToken: () => string | null;
  /** Function to get current refresh token */
  getRefreshToken?: () => string | null;
  /** Function to set tokens */
  setTokens?: (accessToken: string | null, refreshToken: string | null) => void;
  /** Token prefix (default: "Bearer") */
  tokenPrefix?: string;
  /** Custom request interceptor */
  requestInterceptor?: (url: string, config: RequestInit) => Promise<RequestInit>;
  /** Custom response interceptor */
  responseInterceptor?: <T>(response: Response, url: string) => Promise<ApiResponse<T>>;
  /** Custom error interceptor */
  errorInterceptor?: (error: unknown, url: string) => ApiError;
  /** Additional options */
  options?: Partial<BaseClientConfig>;
}

/** Session-based authentication (HTTP cookies) */
export interface SessionAuthClientConfig {
  strategy: "session";
  baseUrl: string;
  /** Custom headers to include with requests */
  headers?: Record<string, string>;
  /** Custom error interceptor (e.g., for PII sanitization) */
  errorInterceptor?: (error: unknown, url: string) => ApiError;
  /** Additional options */
  options?: Partial<BaseClientConfig>;
}

/** Vault token authentication */
export interface VaultAuthClientConfig {
  strategy: "vault";
  baseUrl: string;
  /** Function to get vault token */
  getToken: () => string | null;
  /** Callback when auth fails */
  onAuthError?: () => void;
  /** Whether to unwrap { data: T } responses (default: true) */
  unwrapData?: boolean;
  /** Key to unwrap from response (default: "data") */
  dataKey?: string;
  /** Whether to throw errors instead of returning ApiResponse (default: true) */
  throwErrors?: boolean;
  /** Additional options */
  options?: Partial<BaseClientConfig>;
}

export type ApiClientConfig =
  | TokenAuthClientConfig
  | SessionAuthClientConfig
  | VaultAuthClientConfig;

// ============================================================================
// Token-based Client
// ============================================================================

class TokenAuthClient extends BaseApiClient {
  private requestInterceptor?: TokenAuthClientConfig["requestInterceptor"];
  private responseInterceptor?: TokenAuthClientConfig["responseInterceptor"];
  private errorInterceptorFn?: TokenAuthClientConfig["errorInterceptor"];
  private setTokensFn?: TokenAuthClientConfig["setTokens"];

  constructor(config: TokenAuthClientConfig) {
    super({
      baseUrl: config.baseUrl,
      auth: {
        type: "bearer",
        getToken: config.getAccessToken,
        tokenPrefix: config.tokenPrefix,
      },
      credentials: "include",
      ...config.options,
    });

    this.requestInterceptor = config.requestInterceptor;
    this.responseInterceptor = config.responseInterceptor;
    this.errorInterceptorFn = config.errorInterceptor;
    this.setTokensFn = config.setTokens;
  }

  override async request<T>(endpoint: string, config: Record<string, unknown> = {}): Promise<ApiResponse<T>> {
    // If no custom interceptors, delegate to BaseApiClient which handles JSON.stringify
    if (!this.requestInterceptor && !this.responseInterceptor) {
      return super.request<T>(endpoint, config);
    }

    const url = this.buildUrl(endpoint);

    try {
      // Build headers with auth
      const authHeaders = await this.getAuthHeaders();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeaders,
        ...(config.headers as Record<string, string> || {}),
      };

      // Build fetch config with properly serialized body
      const fetchConfig: RequestInit = {
        method: (config.method as string) || "GET",
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        credentials: "include",
        signal: config.signal as AbortSignal | undefined,
      };

      // Apply request interceptor if provided
      const finalConfig = this.requestInterceptor
        ? await this.requestInterceptor(url, fetchConfig)
        : fetchConfig;

      const response = await fetch(url, finalConfig);

      if (!response.ok) {
        const error = this.errorInterceptorFn
          ? this.errorInterceptorFn(response, url)
          : { message: `HTTP ${response.status}`, status: response.status };
        return { error };
      }

      // Apply response interceptor if provided
      if (this.responseInterceptor) {
        return await this.responseInterceptor<T>(response, url);
      }

      // Default: parse JSON response
      const data = await response.json();
      return { data: data as T };
    } catch (error) {
      const apiError = this.errorInterceptorFn
        ? this.errorInterceptorFn(error, url)
        : { message: error instanceof Error ? error.message : "Request failed" };
      return { error: apiError };
    }
  }

  /**
   * Set authentication tokens
   */
  setAuthTokens(accessToken: string | null, refreshToken: string | null): void {
    if (this.setTokensFn) {
      this.setTokensFn(accessToken, refreshToken);
    }
  }
}

// ============================================================================
// Session-based Client
// ============================================================================

class SessionAuthClient extends BaseApiClient {
  constructor(config: SessionAuthClientConfig) {
    super({
      baseUrl: config.baseUrl,
      auth: { type: "cookie" },
      credentials: "include",
      headers: config.headers,
      errorInterceptor: config.errorInterceptor,
      ...config.options,
    });
  }
}

// ============================================================================
// Vault Client
// ============================================================================

class VaultAuthClient extends BaseApiClient {
  private throwErrors: boolean;

  constructor(config: VaultAuthClientConfig) {
    super({
      baseUrl: config.baseUrl,
      auth: {
        type: "custom",
        getHeaders: (): Record<string, string> => {
          const token = config.getToken();
          if (token) {
            return { "X-Vault-Token": token };
          }
          return {};
        },
        onAuthError: async () => {
          if (config.onAuthError) {
            config.onAuthError();
          }
          return false;
        },
      },
      unwrapData: config.unwrapData ?? true,
      dataKey: config.dataKey ?? "data",
      ...config.options,
    });

    this.throwErrors = config.throwErrors ?? true;
  }

  /**
   * Override buildUrl to ensure Vault routes never get /api prefix
   */
  protected override buildUrl(endpoint: string): string {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      return endpoint;
    }

    const base = this.baseUrl.replace(/\/$/, "");
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  /**
   * Vault LIST operation (special HTTP method)
   */
  async list<T>(endpoint: string): Promise<T> {
    const result = await this.request<T>(endpoint, { method: "LIST" });
    if (this.throwErrors && result.error) {
      throw new VaultApiError(result.error.message, result.error.status ?? 500, [result.error.message]);
    }
    return result.data as T;
  }

  // Override methods to throw errors instead of returning ApiResponse
  override async get<T>(endpoint: string): Promise<T> {
    const result = await super.get<T>(endpoint);
    if (this.throwErrors && result.error) {
      throw new VaultApiError(result.error.message, result.error.status ?? 500, [result.error.message]);
    }
    return result.data as T;
  }

  override async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const result = await super.post<T>(endpoint, body);
    if (this.throwErrors && result.error) {
      throw new VaultApiError(result.error.message, result.error.status ?? 500, [result.error.message]);
    }
    return result.data as T;
  }

  override async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const result = await super.put<T>(endpoint, body);
    if (this.throwErrors && result.error) {
      throw new VaultApiError(result.error.message, result.error.status ?? 500, [result.error.message]);
    }
    return result.data as T;
  }

  override async delete<T>(endpoint: string): Promise<T> {
    const result = await super.delete<T>(endpoint);
    if (this.throwErrors && result.error) {
      throw new VaultApiError(result.error.message, result.error.status ?? 500, [result.error.message]);
    }
    return result.data as T;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export type ApiClient = TokenAuthClient | SessionAuthClient | VaultAuthClient;

/**
 * Create an API client based on configuration
 *
 * @example Token-based (Client App)
 * ```typescript
 * const client = createApiClient({
 *   strategy: "token",
 *   baseUrl: "http://localhost:8080",
 *   getAccessToken: () => sessionStorage.getItem("access_token"),
 *   setTokens: (access, refresh) => {
 *     sessionStorage.setItem("access_token", access);
 *     sessionStorage.setItem("refresh_token", refresh);
 *   },
 * });
 * ```
 *
 * @example Session-based (Admin App)
 * ```typescript
 * const client = createApiClient({
 *   strategy: "session",
 *   baseUrl: "http://localhost:8080",
 *   headers: { "X-App-Type": "admin-ui" },
 *   errorInterceptor: (error) => sanitizeError(error),
 * });
 * ```
 *
 * @example Vault (RustyVault UI)
 * ```typescript
 * const client = createApiClient({
 *   strategy: "vault",
 *   baseUrl: "http://localhost:4117",
 *   getToken: () => useAuthStore.getState().accessToken,
 *   onAuthError: () => useAuthStore.getState().logout(),
 *   throwErrors: true,
 * });
 * ```
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  if (config.strategy === "token") {
    return new TokenAuthClient(config);
  }

  if (config.strategy === "session") {
    return new SessionAuthClient(config);
  }

  if (config.strategy === "vault") {
    return new VaultAuthClient(config);
  }

  throw new Error(`Unknown API client strategy: ${(config as { strategy: string }).strategy}`);
}

// Re-export VaultApiError for convenience
export { VaultApiError };

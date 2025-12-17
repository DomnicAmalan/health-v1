/**
 * Universal Base API Client
 * A comprehensive, constructor-based HTTP client for universal use
 * Supports all authentication methods, interceptors, retry logic, and transformations
 */

import { API_CONFIG, getApiUrl } from "./config";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
  originalError?: Error;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  status?: number;
  headers?: Headers;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "LIST";

export interface RequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  retryAttempts?: number;
  retryDelay?: number;
  skipAuth?: boolean;
  skipInterceptors?: boolean;
  cache?: RequestCache;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  referrerPolicy?: ReferrerPolicy;
}

export type RequestInterceptor = (
  url: string,
  config: RequestConfig & { headers: Record<string, string> }
) =>
  | Promise<RequestConfig & { headers: Record<string, string> }>
  | (RequestConfig & { headers: Record<string, string> });

export type ResponseInterceptor<T = unknown> = (
  response: Response,
  url: string
) => Promise<ApiResponse<T>> | ApiResponse<T>;

export type ErrorInterceptor = (error: unknown, url: string, response?: Response) => ApiError;

export type AuthProvider = () => Record<string, string> | Promise<Record<string, string>>;

export type ResponseTransformer<T = unknown> = (data: unknown) => T;

export type AuthErrorHandler = (response: Response, url: string) => Promise<boolean> | boolean;

// ============================================================================
// Authentication Strategies
// ============================================================================

export type AuthType = "none" | "bearer" | "basic" | "apiKey" | "cookie" | "custom";

export interface AuthConfig {
  type: AuthType;

  // Bearer token auth
  getToken?: () => string | null | Promise<string | null>;
  tokenPrefix?: string; // Default: "Bearer"

  // Basic auth
  username?: string;
  password?: string;
  getCredentials?: () => { username: string; password: string } | null;

  // API Key auth
  apiKey?: string;
  apiKeyHeader?: string; // Default: "X-API-Key"
  getApiKey?: () => string | null;

  // Cookie auth (just sets credentials: "include")

  // Custom auth - full control
  getHeaders?: AuthProvider;

  // Handle auth errors (401)
  onAuthError?: AuthErrorHandler;

  // Auto-refresh token
  refreshToken?: () => Promise<boolean>;
  shouldRefresh?: (response: Response) => boolean;
}

// ============================================================================
// Client Configuration
// ============================================================================

export interface BaseClientConfig {
  // Base settings
  baseUrl?: string;
  timeout?: number;
  credentials?: RequestCredentials;

  // Default headers
  headers?: Record<string, string>;

  // Retry configuration
  retryAttempts?: number;
  retryDelay?: number;
  retryStatusCodes?: number[]; // Status codes to retry on (default: [408, 429, 500, 502, 503, 504])
  retryMethods?: HttpMethod[]; // Methods to retry (default: ["GET", "HEAD", "OPTIONS"])

  // Authentication
  auth?: AuthConfig;

  // Interceptors
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  errorInterceptor?: ErrorInterceptor;

  // Response transformation
  transformResponse?: ResponseTransformer;
  unwrapData?: boolean; // Unwrap { data: T } responses (default: false)
  dataKey?: string; // Key to unwrap (default: "data")

  // Error handling
  throwOnError?: boolean; // Throw instead of returning { error } (default: false)

  // Logging
  debug?: boolean;
  logger?: (message: string, data?: unknown) => void;
}

// ============================================================================
// API Error Class
// ============================================================================

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: unknown;
  public readonly originalError?: Error;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.code = error.code || "UNKNOWN_ERROR";
    this.status = error.status;
    this.details = error.details;
    this.originalError = error.originalError;
  }
}

// ============================================================================
// Universal Base Client
// ============================================================================

export class BaseApiClient {
  // Configuration
  protected readonly baseUrl: string;
  protected readonly timeout: number;
  protected readonly credentials: RequestCredentials;
  protected readonly defaultHeaders: Record<string, string>;

  // Retry settings
  protected readonly retryAttempts: number;
  protected readonly retryDelay: number;
  protected readonly retryStatusCodes: number[];
  protected readonly retryMethods: HttpMethod[];

  // Authentication
  protected readonly auth?: AuthConfig;

  // Interceptors
  protected readonly requestInterceptors: RequestInterceptor[];
  protected readonly responseInterceptors: ResponseInterceptor[];
  protected readonly errorInterceptor: ErrorInterceptor;

  // Response handling
  protected readonly transformResponse?: ResponseTransformer;
  protected readonly unwrapData: boolean;
  protected readonly dataKey: string;
  protected readonly throwOnError: boolean;

  // Logging
  protected readonly debug: boolean;
  protected readonly logger: (message: string, data?: unknown) => void;

  constructor(config: BaseClientConfig = {}) {
    // Base settings
    this.baseUrl = config.baseUrl || API_CONFIG.BASE_URL;
    this.timeout = config.timeout || API_CONFIG.TIMEOUT;
    this.credentials = config.credentials || "same-origin";

    // Default headers
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...config.headers,
    };

    // Retry settings
    this.retryAttempts = config.retryAttempts ?? API_CONFIG.RETRY_ATTEMPTS;
    this.retryDelay = config.retryDelay ?? API_CONFIG.RETRY_DELAY;
    this.retryStatusCodes = config.retryStatusCodes || [408, 429, 500, 502, 503, 504];
    this.retryMethods = config.retryMethods || ["GET", "HEAD", "OPTIONS"];

    // Authentication
    this.auth = config.auth;
    if (this.auth?.type === "cookie") {
      this.credentials = "include";
    }

    // Interceptors
    this.requestInterceptors = config.requestInterceptors || [];
    this.responseInterceptors = config.responseInterceptors || [];
    this.errorInterceptor = config.errorInterceptor || this.defaultErrorInterceptor.bind(this);

    // Response handling
    this.transformResponse = config.transformResponse;
    this.unwrapData = config.unwrapData ?? false;
    this.dataKey = config.dataKey || "data";
    this.throwOnError = config.throwOnError ?? false;

    // Logging
    this.debug = config.debug ?? false;
    this.logger = config.logger || console.log;
  }

  // ==========================================================================
  // Authentication Helpers
  // ==========================================================================

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.auth) return {};

    switch (this.auth.type) {
      case "none":
        return {};

      case "bearer": {
        const token = await this.auth.getToken?.();
        if (token) {
          const prefix = this.auth.tokenPrefix ?? "Bearer";
          return { Authorization: `${prefix} ${token}` };
        }
        return {};
      }

      case "basic": {
        const creds = this.auth.getCredentials?.() || {
          username: this.auth.username || "",
          password: this.auth.password || "",
        };
        if (creds.username) {
          const encoded = btoa(`${creds.username}:${creds.password}`);
          return { Authorization: `Basic ${encoded}` };
        }
        return {};
      }

      case "apiKey": {
        const key = this.auth.getApiKey?.() || this.auth.apiKey;
        if (key) {
          const header = this.auth.apiKeyHeader || "X-API-Key";
          return { [header]: key };
        }
        return {};
      }

      case "cookie":
        return {}; // Cookies are sent via credentials: "include"

      case "custom":
        return (await this.auth.getHeaders?.()) || {};

      default:
        return {};
    }
  }

  protected async handleAuthError(response: Response, url: string): Promise<boolean> {
    if (!this.auth) return false;

    // Try token refresh first
    if (
      this.auth.refreshToken &&
      (this.auth.shouldRefresh?.(response) ?? response.status === 401)
    ) {
      const refreshed = await this.auth.refreshToken();
      if (refreshed) return true;
    }

    // Call custom auth error handler
    if (this.auth.onAuthError) {
      return this.auth.onAuthError(response, url);
    }

    return false;
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  protected defaultErrorInterceptor(error: unknown, url: string, response?: Response): ApiError {
    if (error instanceof ApiClientError) {
      return {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details,
        originalError: error.originalError,
      };
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { message: "Request timeout", code: "TIMEOUT", details: { url } };
      }
      return {
        message: error.message,
        code: "NETWORK_ERROR",
        originalError: error,
        details: { url },
      };
    }

    if (response) {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
        code: `HTTP_${response.status}`,
        status: response.status,
        details: { url },
      };
    }

    return {
      message: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
      details: { url, error },
    };
  }

  // ==========================================================================
  // URL Building
  // ==========================================================================

  protected buildUrl(endpoint: string): string {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      return endpoint;
    }

    // Use shared getApiUrl for consistent path handling
    if (this.baseUrl === API_CONFIG.BASE_URL) {
      return getApiUrl(endpoint);
    }

    // Custom base URL
    const base = this.baseUrl.replace(/\/$/, "");
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  // ==========================================================================
  // Logging
  // ==========================================================================

  protected log(message: string, data?: unknown): void {
    if (this.debug) {
      this.logger(`[BaseApiClient] ${message}`, data);
    }
  }

  // ==========================================================================
  // Core Request Method
  // ==========================================================================

  async request<T = unknown>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const method = config.method || "GET";
    const timeout = config.timeout || this.timeout;

    this.log(`${method} ${url}`, { config });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Build headers
      let headers: Record<string, string> = { ...this.defaultHeaders };

      // Add auth headers unless skipped
      if (!config.skipAuth) {
        const authHeaders = await this.getAuthHeaders();
        headers = { ...headers, ...authHeaders };
      }

      // Add custom headers
      headers = { ...headers, ...config.headers };

      // Apply request interceptors
      let interceptedConfig: RequestConfig & { headers: Record<string, string> } = {
        ...config,
        headers,
        signal: config.signal || controller.signal,
      };

      if (!config.skipInterceptors) {
        for (const interceptor of this.requestInterceptors) {
          interceptedConfig = await interceptor(url, interceptedConfig);
        }
      }

      // Make the request
      const response = await fetch(url, {
        method,
        headers: interceptedConfig.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: interceptedConfig.signal,
        credentials: config.credentials || this.credentials,
        cache: config.cache,
        mode: config.mode,
        redirect: config.redirect,
        referrerPolicy: config.referrerPolicy,
      });

      clearTimeout(timeoutId);

      this.log(`Response ${response.status}`, { url, status: response.status });

      // Handle non-OK responses
      if (!response.ok) {
        // Handle auth errors
        if (response.status === 401) {
          const shouldRetry = await this.handleAuthError(response, url);
          if (shouldRetry) {
            return this.request<T>(endpoint, config);
          }
        }

        // Parse error response
        let errorDetails: unknown;
        try {
          errorDetails = await response.json();
        } catch {
          errorDetails = { statusText: response.statusText };
        }

        const error: ApiError = {
          message: this.extractErrorMessage(errorDetails) || `HTTP ${response.status}`,
          code: `HTTP_${response.status}`,
          status: response.status,
          details: errorDetails,
        };

        if (this.throwOnError) {
          throw new ApiClientError(error);
        }

        return { error, status: response.status, headers: response.headers };
      }

      // Apply response interceptors
      if (!config.skipInterceptors && this.responseInterceptors.length > 0) {
        for (const interceptor of this.responseInterceptors) {
          const result = await interceptor(response.clone(), url);
          if (result.error || result.data !== undefined) {
            return result as ApiResponse<T>;
          }
        }
      }

      // Parse response
      const contentType = response.headers.get("content-type");
      let data: unknown;

      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else if (contentType?.includes("text/")) {
        data = await response.text();
      } else if (response.status === 204 || response.headers.get("content-length") === "0") {
        data = undefined;
      } else {
        data = await response.blob();
      }

      // Unwrap data if configured
      if (
        this.unwrapData &&
        data &&
        typeof data === "object" &&
        this.dataKey in (data as Record<string, unknown>)
      ) {
        data = (data as Record<string, unknown>)[this.dataKey];
      }

      // Transform response if configured
      if (this.transformResponse) {
        data = this.transformResponse(data);
      }

      return { data: data as T, status: response.status, headers: response.headers };
    } catch (error) {
      clearTimeout(timeoutId);

      const apiError = this.errorInterceptor(error, url);

      if (this.throwOnError) {
        throw new ApiClientError(apiError);
      }

      return { error: apiError };
    }
  }

  // ==========================================================================
  // Request with Retry
  // ==========================================================================

  async requestWithRetry<T = unknown>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const method = config.method || "GET";
    const attempts = config.retryAttempts ?? this.retryAttempts;
    const delay = config.retryDelay ?? this.retryDelay;

    // Only retry on certain methods
    if (!this.retryMethods.includes(method)) {
      return this.request<T>(endpoint, config);
    }

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const result = await this.request<T>(endpoint, config);

      // Success or client error (4xx) - don't retry
      if (
        result.data !== undefined ||
        (result.error?.status &&
          result.error.status < 500 &&
          result.error.status !== 408 &&
          result.error.status !== 429)
      ) {
        return result;
      }

      // Check if we should retry this status code
      if (result.error?.status && !this.retryStatusCodes.includes(result.error.status)) {
        return result;
      }

      this.log(`Retry attempt ${attempt}/${attempts}`, { endpoint, error: result.error });

      // Wait before retry with exponential backoff
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }

    // Final attempt
    return this.request<T>(endpoint, config);
  }

  // ==========================================================================
  // Convenience Methods
  // ==========================================================================

  async get<T = unknown>(
    endpoint: string,
    config?: Omit<RequestConfig, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: Omit<RequestConfig, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "POST", body });
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: Omit<RequestConfig, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "PUT", body });
  }

  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: Omit<RequestConfig, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "PATCH", body });
  }

  async delete<T = unknown>(
    endpoint: string,
    config?: Omit<RequestConfig, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }

  async head(
    endpoint: string,
    config?: Omit<RequestConfig, "method" | "body">
  ): Promise<ApiResponse<void>> {
    return this.request<void>(endpoint, { ...config, method: "HEAD" });
  }

  async options<T = unknown>(
    endpoint: string,
    config?: Omit<RequestConfig, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "OPTIONS" });
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  protected extractErrorMessage(data: unknown): string | undefined {
    if (!data || typeof data !== "object") return undefined;

    const obj = data as Record<string, unknown>;

    // Common error message patterns
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (Array.isArray(obj.errors) && typeof obj.errors[0] === "string") return obj.errors[0];
    if (typeof obj.detail === "string") return obj.detail;
    if (typeof obj.msg === "string") return obj.msg;

    return undefined;
  }

  // ==========================================================================
  // Instance Methods for Dynamic Configuration
  // ==========================================================================

  /**
   * Create a new client with modified configuration
   */
  extend(config: Partial<BaseClientConfig>): BaseApiClient {
    return new BaseApiClient({
      baseUrl: config.baseUrl ?? this.baseUrl,
      timeout: config.timeout ?? this.timeout,
      credentials: config.credentials ?? this.credentials,
      headers: { ...this.defaultHeaders, ...config.headers },
      retryAttempts: config.retryAttempts ?? this.retryAttempts,
      retryDelay: config.retryDelay ?? this.retryDelay,
      retryStatusCodes: config.retryStatusCodes ?? this.retryStatusCodes,
      retryMethods: config.retryMethods ?? this.retryMethods,
      auth: config.auth ?? this.auth,
      requestInterceptors: config.requestInterceptors ?? this.requestInterceptors,
      responseInterceptors: config.responseInterceptors ?? this.responseInterceptors,
      errorInterceptor: config.errorInterceptor ?? this.errorInterceptor,
      transformResponse: config.transformResponse ?? this.transformResponse,
      unwrapData: config.unwrapData ?? this.unwrapData,
      dataKey: config.dataKey ?? this.dataKey,
      throwOnError: config.throwOnError ?? this.throwOnError,
      debug: config.debug ?? this.debug,
      logger: config.logger ?? this.logger,
    });
  }

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }
}

// ============================================================================
// Factory Functions for Common Configurations
// ============================================================================

/**
 * Create a public API client (no authentication)
 */
export function createPublicClient(config?: Omit<BaseClientConfig, "auth">): BaseApiClient {
  return new BaseApiClient({ ...config, auth: { type: "none" } });
}

/**
 * Create a session-based client (cookie authentication)
 */
export function createSessionClient(
  config?: Omit<BaseClientConfig, "auth" | "credentials">
): BaseApiClient {
  return new BaseApiClient({
    ...config,
    auth: { type: "cookie" },
    credentials: "include",
  });
}

/**
 * Create a token-based client (Bearer authentication)
 */
export function createTokenClient(
  getToken: () => string | null | Promise<string | null>,
  config?: Omit<BaseClientConfig, "auth">
): BaseApiClient {
  return new BaseApiClient({
    ...config,
    auth: {
      type: "bearer",
      getToken,
    },
  });
}

/**
 * Create an API key client
 */
export function createApiKeyClient(
  apiKey: string | (() => string | null),
  headerName?: string,
  config?: Omit<BaseClientConfig, "auth">
): BaseApiClient {
  return new BaseApiClient({
    ...config,
    auth: {
      type: "apiKey",
      apiKey: typeof apiKey === "string" ? apiKey : undefined,
      getApiKey: typeof apiKey === "function" ? apiKey : undefined,
      apiKeyHeader: headerName,
    },
  });
}

// ============================================================================
// Legacy Exports for Backward Compatibility
// ============================================================================

/** @deprecated Use BaseApiClient with auth config instead */
export class PublicApiClient extends BaseApiClient {
  constructor(config?: Omit<BaseClientConfig, "auth">) {
    super({ ...config, auth: { type: "none" } });
  }
}

/** @deprecated Use BaseApiClient with auth: { type: "cookie" } instead */
export class SessionApiClient extends BaseApiClient {
  constructor(config?: Omit<BaseClientConfig, "auth" | "credentials">) {
    super({ ...config, auth: { type: "cookie" }, credentials: "include" });
  }
}

/** @deprecated Use BaseApiClient with auth: { type: "bearer" } instead */
export class TokenApiClient extends BaseApiClient {
  constructor(
    config: Omit<BaseClientConfig, "auth"> & {
      getToken: () => string | null;
      onAuthError?: () => void;
    }
  ) {
    super({
      ...config,
      auth: {
        type: "bearer",
        getToken: config.getToken,
        onAuthError: config.onAuthError
          ? async () => {
              config.onAuthError?.();
              return false;
            }
          : undefined,
      },
    });
  }
}

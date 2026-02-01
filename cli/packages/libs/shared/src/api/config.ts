/**
 * API Configuration Constants
 * Unified API configuration used across all applications
 */

export const API_CONFIG = {
  BASE_URL:
    typeof window !== "undefined"
      ? import.meta.env.VITE_API_BASE_URL || "http://localhost:4117"
      : "http://localhost:4117",
  API_PREFIX: import.meta.env?.VITE_API_PREFIX || "",
  TIMEOUT: Number(import.meta.env?.VITE_API_TIMEOUT) || 30000, // 30 seconds
  RETRY_ATTEMPTS: Number(import.meta.env?.VITE_API_RETRY_ATTEMPTS) || 3,
  RETRY_DELAY: Number(import.meta.env?.VITE_API_RETRY_DELAY) || 1000, // 1 second
} as const;



/**
 * Create full API URL - just concatenate BASE_URL + path
 * BASE_URL from env should already include /api if needed
 */
export function getApiUrl(path: string): string {
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, "");
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${apiPath}`;
}

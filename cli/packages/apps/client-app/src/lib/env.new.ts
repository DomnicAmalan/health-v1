/**
 * Environment Configuration for Client App
 * Uses shared environment validator from @lazarus-life/shared
 */

import { createEnvValidator, validators } from "@lazarus-life/shared/env";

/**
 * Environment variable configuration
 */
interface ClientEnv extends Record<string, string> {
  VITE_API_BASE_URL: string;
  VITE_API_TIMEOUT: string;
  VITE_OIDC_ISSUER: string;
  VITE_OIDC_CLIENT_ID: string;
  VITE_OIDC_REDIRECT_URI: string;
}

/**
 * Create environment validator
 */
const envValidator = createEnvValidator<ClientEnv>(
  [
    {
      name: "VITE_API_BASE_URL",
      required: true,
      defaultValue: "http://localhost:4117",
      validate: validators.url,
      description: "API base URL",
    },
    {
      name: "VITE_API_TIMEOUT",
      required: false,
      defaultValue: "30000",
      validate: validators.number,
      description: "API request timeout in milliseconds",
    },
    {
      name: "VITE_OIDC_ISSUER",
      required: true,
      defaultValue: "http://localhost:4117",
      validate: validators.url,
      description: "OIDC issuer URL",
    },
    {
      name: "VITE_OIDC_CLIENT_ID",
      required: true,
      defaultValue: "default-client",
      validate: validators.nonEmpty,
      description: "OIDC client ID",
    },
    {
      name: "VITE_OIDC_REDIRECT_URI",
      required: false,
      defaultValue: typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
      validate: validators.url,
      description: "OIDC redirect URI",
    },
  ],
  {
    throwOnError: false,
    warnOnMissing: true,
  }
);

/**
 * Get validated environment configuration
 */
export const env = envValidator.getConfig();

/**
 * Environment helpers
 */
export const API_BASE_URL = env.VITE_API_BASE_URL;
export const API_TIMEOUT = Number.parseInt(env.VITE_API_TIMEOUT || "30000", 10);
export const OIDC_ISSUER = env.VITE_OIDC_ISSUER;
export const OIDC_CLIENT_ID = env.VITE_OIDC_CLIENT_ID;
export const OIDC_REDIRECT_URI = env.VITE_OIDC_REDIRECT_URI;

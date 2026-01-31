/**
 * Environment Configuration for RustyVault UI
 * Uses shared environment validator from @lazarus-life/shared
 */

import { createEnvValidator, validators } from "@lazarus-life/shared/env";

/**
 * Environment variable configuration
 */
interface RustyVaultEnv extends Record<string, string> {
  VITE_API_BASE_URL: string;
  VITE_API_TIMEOUT: string;
  VITE_API_RETRY_ATTEMPTS: string;
  VITE_API_RETRY_DELAY: string;
  VITE_PORT: string;
  VITE_HOST: string;
  VITE_ENABLE_DEBUG: string;
}

/**
 * Create environment validator
 */
const envValidator = createEnvValidator<RustyVaultEnv>(
  [
    {
      name: "VITE_API_BASE_URL",
      required: true,
      defaultValue: "http://localhost:4117/v1",
      validate: validators.url,
      description: "Vault API base URL",
    },
    {
      name: "VITE_API_TIMEOUT",
      required: false,
      defaultValue: "30000",
      validate: validators.number,
      description: "API request timeout in milliseconds",
    },
    {
      name: "VITE_API_RETRY_ATTEMPTS",
      required: false,
      defaultValue: "3",
      validate: validators.number,
      description: "Number of retry attempts for failed requests",
    },
    {
      name: "VITE_API_RETRY_DELAY",
      required: false,
      defaultValue: "1000",
      validate: validators.number,
      description: "Delay between retry attempts in milliseconds",
    },
    {
      name: "VITE_PORT",
      required: false,
      defaultValue: "4115",
      validate: validators.port,
      description: "Vite dev server port",
    },
    {
      name: "VITE_HOST",
      required: false,
      defaultValue: "localhost",
      validate: validators.nonEmpty,
      description: "Vite dev server host",
    },
    {
      name: "VITE_ENABLE_DEBUG",
      required: false,
      defaultValue: "false",
      validate: validators.boolean,
      description: "Enable debug mode",
    },
  ],
  {
    throwOnError: false, // Don't throw in development
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
export const API_RETRY_ATTEMPTS = Number.parseInt(env.VITE_API_RETRY_ATTEMPTS || "3", 10);
export const API_RETRY_DELAY = Number.parseInt(env.VITE_API_RETRY_DELAY || "1000", 10);
export const DEV_SERVER_PORT = Number.parseInt(env.VITE_PORT || "4115", 10);
export const DEV_SERVER_HOST = env.VITE_HOST || "localhost";
export const isDebugEnabled = envValidator.isFeatureEnabled("VITE_ENABLE_DEBUG");

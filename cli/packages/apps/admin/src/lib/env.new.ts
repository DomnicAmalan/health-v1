/**
 * Environment Configuration for Admin App
 * Uses shared environment validator from @lazarus-life/shared
 */

import { createEnvValidator, validators } from "@lazarus-life/shared/env";

/**
 * Environment variable configuration
 */
interface AdminEnv extends Record<string, string> {
  VITE_API_BASE_URL: string;
  VITE_OIDC_ISSUER: string;
  VITE_OIDC_CLIENT_ID: string;
  VITE_ENABLE_MFA: string;
  VITE_ENABLE_PASSKEYS: string;
  VITE_ENABLE_SSO: string;
  VITE_ENABLE_POSTGRES: string;
  VITE_ENABLE_OPENBAO_SERVICE: string;
  VITE_ENABLE_LOCALSTACK: string;
  VITE_ENABLE_NATS: string;
  VITE_ENABLE_KAFKA: string;
}

/**
 * Create environment validator
 */
const envValidator = createEnvValidator<AdminEnv>(
  [
    {
      name: "VITE_API_BASE_URL",
      required: true,
      defaultValue: "http://localhost:4117",
      validate: validators.url,
      description: "API base URL",
    },
    {
      name: "VITE_OIDC_ISSUER",
      required: false,
      defaultValue: "",
      validate: (value) => !value || validators.url(value),
      description: "OIDC issuer URL",
    },
    {
      name: "VITE_OIDC_CLIENT_ID",
      required: false,
      defaultValue: "",
      description: "OIDC client ID",
    },
    // Feature flags
    {
      name: "VITE_ENABLE_MFA",
      required: false,
      defaultValue: "false",
      validate: validators.boolean,
      description: "Enable multi-factor authentication",
    },
    {
      name: "VITE_ENABLE_PASSKEYS",
      required: false,
      defaultValue: "false",
      validate: validators.boolean,
      description: "Enable passkey authentication",
    },
    {
      name: "VITE_ENABLE_SSO",
      required: false,
      defaultValue: "false",
      validate: validators.boolean,
      description: "Enable single sign-on",
    },
    // Service flags
    {
      name: "VITE_ENABLE_POSTGRES",
      required: false,
      defaultValue: "true",
      validate: validators.boolean,
      description: "Enable PostgreSQL service",
    },
    {
      name: "VITE_ENABLE_OPENBAO_SERVICE",
      required: false,
      defaultValue: "true",
      validate: validators.boolean,
      description: "Enable OpenBao vault service",
    },
    {
      name: "VITE_ENABLE_LOCALSTACK",
      required: false,
      defaultValue: "true",
      validate: validators.boolean,
      description: "Enable LocalStack for AWS services",
    },
    {
      name: "VITE_ENABLE_NATS",
      required: false,
      defaultValue: "false",
      validate: validators.boolean,
      description: "Enable NATS messaging",
    },
    {
      name: "VITE_ENABLE_KAFKA",
      required: false,
      defaultValue: "false",
      validate: validators.boolean,
      description: "Enable Kafka messaging",
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
export const isDevelopment =
  typeof import.meta !== "undefined" ? import.meta.env.DEV : false;
export const isProduction =
  typeof import.meta !== "undefined" ? import.meta.env.PROD : false;

// Feature flags
export const isMFAEnabled = envValidator.isFeatureEnabled("VITE_ENABLE_MFA");
export const isPasskeysEnabled = envValidator.isFeatureEnabled("VITE_ENABLE_PASSKEYS");
export const isSSOEnabled = envValidator.isFeatureEnabled("VITE_ENABLE_SSO");

// Service enable flags
export const isPostgresEnabled = envValidator.isFeatureEnabled("VITE_ENABLE_POSTGRES");
export const isOpenBaoEnabled = envValidator.isFeatureEnabled("VITE_ENABLE_OPENBAO_SERVICE");
export const isLocalStackEnabled = envValidator.isFeatureEnabled("VITE_ENABLE_LOCALSTACK");
export const isNATSEnabled = envValidator.isFeatureEnabled("VITE_ENABLE_NATS");
export const isKafkaEnabled = envValidator.isFeatureEnabled("VITE_ENABLE_KAFKA");

// API configuration
export const API_BASE_URL = env.VITE_API_BASE_URL;
export const OIDC_ISSUER = env.VITE_OIDC_ISSUER;
export const OIDC_CLIENT_ID = env.VITE_OIDC_CLIENT_ID;

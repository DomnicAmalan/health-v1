/**
 * Base PostCSS Configuration
 * Shared across all apps
 * 
 * Framework-agnostic PostCSS config that works with any build tool
 * 
 * Apps can use this directly or extend it:
 * @example
 * // postcss.config.js
 * import baseConfig from "@lazarus-life/shared/styles/postcss.config.js";
 * export default baseConfig;
 */

export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};

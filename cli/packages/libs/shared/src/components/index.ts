/**
 * Shared Components
 */

// LoginForm is now in @lazarus-life/ui-components
// Re-export for backwards compatibility
export {
  LoginForm,
  type LoginFormProps,
  type LoginMethod,
  type EmailPasswordMethod,
  type TokenMethod,
  type UsernamePasswordMethod,
  type AppRoleMethod,
  type CustomMethod,
} from "@lazarus-life/ui-components";

export * from "./ProtectedRoute";

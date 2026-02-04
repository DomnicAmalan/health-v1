/**
 * Login Form Component - Shared
 * Flexible login form supporting multiple authentication methods
 */

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Stack,
} from "@lazarus-life/ui-components";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Simple email/password login
 */
export interface EmailPasswordMethod {
  type: "email-password";
  onSubmit: (email: string, password: string) => Promise<void>;
  emailLabel?: string;
  emailPlaceholder?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
}

/**
 * Token-based login (e.g., Vault)
 */
export interface TokenMethod {
  type: "token";
  onSubmit: (token: string) => Promise<void>;
  tokenLabel?: string;
  tokenPlaceholder?: string;
}

/**
 * Username/password login
 */
export interface UsernamePasswordMethod {
  type: "username-password";
  onSubmit: (username: string, password: string) => Promise<void>;
  usernameLabel?: string;
  usernamePlaceholder?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
}

/**
 * AppRole login (Vault)
 */
export interface AppRoleMethod {
  type: "approle";
  onSubmit: (roleId: string, secretId: string) => Promise<void>;
  roleIdLabel?: string;
  roleIdPlaceholder?: string;
  secretIdLabel?: string;
  secretIdPlaceholder?: string;
}

/**
 * Custom login method (render prop)
 */
export interface CustomMethod {
  type: "custom";
  label: string;
  render: (props: { isLoading: boolean; onSubmit: (data: unknown) => Promise<void> }) => React.ReactNode;
  onSubmit: (data: unknown) => Promise<void>;
}

export type LoginMethod =
  | EmailPasswordMethod
  | TokenMethod
  | UsernamePasswordMethod
  | AppRoleMethod
  | CustomMethod;

export interface LoginFormProps {
  /** Login methods to support (single method if array has one item) */
  methods: LoginMethod[];
  /** Default method index (default: 0) */
  defaultMethod?: number;
  /** Logo URL */
  logoUrl?: string;
  /** Title */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Submit button text (default: "Sign In") */
  submitText?: string;
  /** Submitting button text (default: "Signing In...") */
  submittingText?: string;
  /** Error validation messages */
  validation?: {
    emailRequired?: string;
    passwordRequired?: string;
    invalidEmail?: string;
    tokenRequired?: string;
    usernameRequired?: string;
    roleIdRequired?: string;
    secretIdRequired?: string;
  };
  /** Custom error message (e.g., from auth store) */
  error?: string | null;
  /** Loading state (e.g., from auth store) */
  isLoading?: boolean;
  /** Additional footer content */
  footer?: React.ReactNode;
  /** Layout variant */
  variant?: "card" | "box";
  /** Custom class name for wrapper */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function LoginForm({
  methods,
  defaultMethod = 0,
  logoUrl = "/logo-main.png",
  title = "Sign In",
  subtitle,
  submitText = "Sign In",
  submittingText = "Signing In...",
  validation = {},
  error: externalError,
  isLoading = false,
  footer,
  variant = "card",
  className,
}: LoginFormProps) {
  const [currentMethodIndex, setCurrentMethodIndex] = useState(defaultMethod);
  const [localError, setLocalError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const currentMethod = methods[currentMethodIndex];
  const hasMultipleMethods = methods.length > 1;
  const displayError = externalError || localError;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    try {
      const method = currentMethod;

      if (method.type === "email-password") {
        const email = formData.email || "";
        const password = formData.password || "";

        if (!email || !password) {
          setLocalError(validation.emailRequired || "Email and password are required");
          return;
        }

        if (!email.includes("@")) {
          setLocalError(validation.invalidEmail || "Invalid email address");
          return;
        }

        await method.onSubmit(email, password);
      } else if (method.type === "token") {
        const token = formData.token || "";

        if (!token.trim()) {
          setLocalError(validation.tokenRequired || "Token is required");
          return;
        }

        await method.onSubmit(token.trim());
      } else if (method.type === "username-password") {
        const username = formData.username || "";
        const password = formData.password || "";

        if (!username || !password) {
          setLocalError(validation.usernameRequired || "Username and password are required");
          return;
        }

        await method.onSubmit(username.trim(), password);
      } else if (method.type === "approle") {
        const roleId = formData.roleId || "";
        const secretId = formData.secretId || "";

        if (!roleId || !secretId) {
          setLocalError(validation.roleIdRequired || "Role ID and Secret ID are required");
          return;
        }

        await method.onSubmit(roleId.trim(), secretId.trim());
      } else if (method.type === "custom") {
        await method.onSubmit(formData);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Authentication failed");
    }
  };

  const renderFormFields = () => {
    const method = currentMethod;

    if (method.type === "email-password") {
      return (
        <Stack spacing="md">
          <div className="space-y-2">
            <Label htmlFor="email">{method.emailLabel || "Email"}</Label>
            <Input
              id="email"
              type="email"
              placeholder={method.emailPlaceholder || "you@example.com"}
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isLoading}
              required
              autoComplete="email"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{method.passwordLabel || "Password"}</Label>
            <Input
              id="password"
              type="password"
              placeholder={method.passwordPlaceholder || "••••••••"}
              value={formData.password || ""}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isLoading}
              required
              autoComplete="current-password"
            />
          </div>
        </Stack>
      );
    }

    if (method.type === "token") {
      return (
        <div className="space-y-2">
          <Label htmlFor="token">{method.tokenLabel || "Token"}</Label>
          <Input
            id="token"
            type="password"
            placeholder={method.tokenPlaceholder || "Enter your token"}
            value={formData.token || ""}
            onChange={(e) => setFormData({ ...formData, token: e.target.value })}
            disabled={isLoading}
            required
            autoFocus
          />
        </div>
      );
    }

    if (method.type === "username-password") {
      return (
        <Stack spacing="md">
          <div className="space-y-2">
            <Label htmlFor="username">{method.usernameLabel || "Username"}</Label>
            <Input
              id="username"
              type="text"
              placeholder={method.usernamePlaceholder || "username"}
              value={formData.username || ""}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={isLoading}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{method.passwordLabel || "Password"}</Label>
            <Input
              id="password"
              type="password"
              placeholder={method.passwordPlaceholder || "••••••••"}
              value={formData.password || ""}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isLoading}
              required
            />
          </div>
        </Stack>
      );
    }

    if (method.type === "approle") {
      return (
        <Stack spacing="md">
          <div className="space-y-2">
            <Label htmlFor="roleId">{method.roleIdLabel || "Role ID"}</Label>
            <Input
              id="roleId"
              type="text"
              placeholder={method.roleIdPlaceholder || "Enter role ID"}
              value={formData.roleId || ""}
              onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              disabled={isLoading}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secretId">{method.secretIdLabel || "Secret ID"}</Label>
            <Input
              id="secretId"
              type="password"
              placeholder={method.secretIdPlaceholder || "Enter secret ID"}
              value={formData.secretId || ""}
              onChange={(e) => setFormData({ ...formData, secretId: e.target.value })}
              disabled={isLoading}
              required
            />
          </div>
        </Stack>
      );
    }

    if (method.type === "custom") {
      return method.render({
        isLoading,
        onSubmit: async (data) => {
          setFormData(data as Record<string, string>);
          await method.onSubmit(data);
        },
      });
    }

    return null;
  };

  const renderMethodTabs = () => {
    if (!hasMultipleMethods) return null;

    return (
      <div className="flex gap-2 border-b">
        {methods.map((method, index) => {
          const label =
            method.type === "custom"
              ? method.label
              : method.type === "email-password"
                ? "Email"
                : method.type === "token"
                  ? "Token"
                  : method.type === "username-password"
                    ? "Username"
                    : "AppRole";

          return (
            <button
              key={index}
              type="button"
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                currentMethodIndex === index
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setCurrentMethodIndex(index);
                setFormData({});
                setLocalError(null);
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Stack spacing="md">
        {renderMethodTabs()}
        {renderFormFields()}

        {displayError && (
          <div
            className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {submittingText}
            </>
          ) : (
            submitText
          )}
        </Button>

        {footer}
      </Stack>
    </form>
  );

  if (variant === "box") {
    return (
      <div className={`w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-lg ${className || ""}`}>
        <Stack spacing="lg">
          <div className="text-center">
            {logoUrl && (
              <div className="flex justify-center mb-4">
                <img src={logoUrl} alt={title} className="h-16 w-16" />
              </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {content}
        </Stack>
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card className={`w-full max-w-md ${className || ""}`}>
      <CardHeader className="text-center">
        {logoUrl && (
          <div className="flex justify-center mb-4">
            <img src={logoUrl} alt={title} className="h-16 w-16" />
          </div>
        )}
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

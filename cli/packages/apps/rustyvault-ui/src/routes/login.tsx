import { LoginForm } from "@lazarus-life/shared";
import { useTranslation } from "@lazarus-life/shared/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    login,
    loginWithUserpass,
    loginWithAppRole,
    isLoading,
    isAuthenticated,
    error: authError,
    clearError,
  } = useAuthStore();

  const [error, setError] = useState("");

  useEffect(() => {
    if (authError && !error) {
      setError(authError);
      clearError();
    }
  }, [authError, error, clearError]);

  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = new URLSearchParams(window.location.search).get("redirect") || "/";
      navigate({ to: redirectTo as "/", replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleVaultSealedError = (err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : t("login.errors.authenticationFailed");

    if (
      errorMessage.toLowerCase().includes("barrier is sealed") ||
      errorMessage.toLowerCase().includes("vault is sealed") ||
      errorMessage.toLowerCase().includes("vault error: barrier is sealed")
    ) {
      throw new Error(t("login.errors.vaultSealed"));
    }
    throw err;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <LoginForm
        methods={[
          {
            type: "token",
            onSubmit: async (token) => {
              try {
                await login(token);
              } catch (err) {
                handleVaultSealedError(err);
              }
            },
            tokenLabel: t("login.fields.token"),
            tokenPlaceholder: t("login.placeholders.token"),
          },
          {
            type: "username-password",
            onSubmit: async (username, password) => {
              try {
                await loginWithUserpass(username, password);
              } catch (err) {
                handleVaultSealedError(err);
              }
            },
            usernameLabel: t("login.fields.username"),
            usernamePlaceholder: t("login.placeholders.username"),
            passwordLabel: t("login.fields.password"),
            passwordPlaceholder: t("login.placeholders.password"),
          },
          {
            type: "approle",
            onSubmit: async (roleId, secretId) => {
              try {
                await loginWithAppRole(roleId, secretId);
              } catch (err) {
                handleVaultSealedError(err);
              }
            },
            roleIdLabel: t("login.fields.roleId"),
            roleIdPlaceholder: t("login.placeholders.roleId"),
            secretIdLabel: t("login.fields.secretId"),
            secretIdPlaceholder: t("login.placeholders.secretId"),
          },
        ]}
        defaultMethod={0}
        logoUrl="/logo-main.png"
        title={t("login.title")}
        subtitle={t("login.subtitle")}
        submitText={t("login.actions.signIn")}
        submittingText={t("login.actions.signingIn")}
        validation={{
          tokenRequired: t("login.errors.tokenRequired"),
          usernameRequired: t("login.errors.usernamePasswordRequired"),
          roleIdRequired: t("login.errors.roleIdSecretIdRequired"),
        }}
        error={error || authError}
        isLoading={isLoading}
        variant="card"
      />
    </div>
  );
}

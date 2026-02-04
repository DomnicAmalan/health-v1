import { LoginForm } from "@lazarus-life/shared";
import { useTranslation } from "@lazarus-life/shared/i18n";
import { Flex } from "@lazarus-life/ui-components";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = new URLSearchParams(window.location.search).get("redirect") || "/";
      navigate({ to: redirectTo as "/" });
    }
  }, [isAuthenticated, navigate]);

  return (
    <Flex
      className="min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4"
      direction="column"
    >
      <LoginForm
        methods={[
          {
            type: "email-password",
            onSubmit: login,
            emailLabel: t("login.fields.email"),
            emailPlaceholder: t("login.placeholders.email"),
            passwordLabel: t("login.fields.password"),
            passwordPlaceholder: t("login.placeholders.password"),
          },
        ]}
        logoUrl="/logo-main.png"
        title={t("login.title")}
        subtitle={t("login.subtitle")}
        submitText={t("login.actions.signIn")}
        submittingText={t("login.actions.signingIn")}
        validation={{
          emailRequired: t("login.errors.emailPasswordRequired"),
          invalidEmail: t("login.errors.invalidEmail"),
        }}
        error={error}
        isLoading={isLoading}
        variant="card"
      />
    </Flex>
  );
}

import { LoginForm } from "@lazarus-life/shared";
import { useTranslation } from "@lazarus-life/shared/i18n";
import { Flex } from "@lazarus-life/ui-components";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated } = useAuthStore();

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
            emailLabel: t("auth.email"),
            emailPlaceholder: t("login.placeholders.email"),
            passwordLabel: t("auth.password"),
            passwordPlaceholder: t("login.placeholders.password"),
          },
        ]}
        logoUrl="/logo-main.png"
        title={t("auth.signIn")}
        subtitle={t("login.title")}
        submitText={t("auth.signIn")}
        submittingText={t("auth.signingIn")}
        validation={{
          emailRequired: t("validation.required"),
          invalidEmail: t("validation.invalidEmail"),
        }}
        error={error}
        isLoading={isLoading}
        variant="box"
        footer={
          <div className="text-center text-sm text-muted-foreground">
            <p>{t("login.secureAuth")}</p>
          </div>
        }
      />
    </Flex>
  );
}

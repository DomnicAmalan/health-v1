import { useTranslation } from "@lazarus-life/shared/i18n";
import { Box, Button, Flex, Input, Label, Stack } from "@lazarus-life/ui-components";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = new URLSearchParams(window.location.search).get("redirect") || "/";
      navigate({ to: redirectTo as "/" });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Basic validation
    if (!(email && password)) {
      setLocalError(t("validation.required"));
      return;
    }

    if (!email.includes("@")) {
      setLocalError(t("validation.invalidEmail"));
      return;
    }

    try {
      await login(email, password);
      // Navigation will happen via useEffect when isAuthenticated becomes true
      const redirectTo = new URLSearchParams(window.location.search).get("redirect") || "/";
      navigate({ to: redirectTo as "/" });
    } catch (err) {
      // Error is handled by auth store
      setLocalError(err instanceof Error ? err.message : t("errors.generic"));
    }
  };

  const displayError = error || localError;

  return (
    <Flex
      className="min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4"
      direction="column"
    >
      <Box className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-lg">
        <Stack spacing="lg">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img src="/logo-main.png" alt={t("branding.appName")} className="h-16 w-16" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t("auth.signIn")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("login.title")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Stack spacing="md">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("login.placeholders.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required={true}
                  autoComplete="email"
                  autoFocus={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("login.placeholders.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required={true}
                  autoComplete="current-password"
                />
              </div>
            </Stack>

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
                  {t("auth.signingIn")}
                </>
              ) : (
                t("auth.signIn")
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p>{t("login.secureAuth")}</p>
          </div>
        </Stack>
      </Box>
    </Flex>
  );
}

import { useTranslation } from "@lazarus-life/shared/i18n";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Flex,
  Input,
  Label,
  Stack,
} from "@lazarus-life/ui-components";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

export function LoginPage() {
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
    if (!email || !password) {
      setLocalError(t("login.errors.emailPasswordRequired"));
      return;
    }

    if (!email.includes("@")) {
      setLocalError(t("login.errors.invalidEmail"));
      return;
    }

    try {
      await login(email, password);
      // Navigation will happen via useEffect when isAuthenticated becomes true
      const redirectTo = new URLSearchParams(window.location.search).get("redirect") || "/";
      navigate({ to: redirectTo as "/" });
    } catch (err) {
      // Error is handled by auth store
      setLocalError(err instanceof Error ? err.message : t("login.errors.loginFailed"));
    }
  };

  const displayError = error || localError;

  return (
    <Flex
      className="min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4"
      direction="column"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/logo-main.png" alt={t("login.title")} className="h-16 w-16" />
          </div>
          <CardTitle>{t("login.title")}</CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Stack spacing="md">
              <div className="space-y-2">
                <Label htmlFor="email">{t("login.fields.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("login.placeholders.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("login.fields.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("login.placeholders.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
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
                  {t("login.actions.signingIn")}
                </>
              ) : (
                t("login.actions.signIn")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Flex>
  );
}

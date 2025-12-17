import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import { Button, Input } from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Shield, User } from "lucide-react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@lazarus-life/ui-components";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/settings")({
  component: SettingsComponent,
});

function SettingsComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.SETTINGS.VIEW} resource="settings">
      <SettingsComponentInner />
    </ProtectedRoute>
  );
}

function SettingsComponentInner() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("settings.profile")}
            </CardTitle>
            <CardDescription>{t("settings.updatePersonalInfo")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("common.name")}</Label>
              <Input id="name" placeholder="John Doe" defaultValue="John Doe" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                defaultValue="john@example.com"
              />
            </div>
            <Button>{t("common.saveChanges")}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("settings.notifications")}
            </CardTitle>
            <CardDescription>{t("settings.configureNotifications")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("settings.emailNotifications")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.receiveEmailUpdates")}</p>
              </div>
              <Button variant="outline" size="sm">
                {t("common.enabled")}
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("settings.pushNotifications")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.receivePushNotifications")}
                </p>
              </div>
              <Button variant="outline" size="sm">
                {t("common.enabled")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("settings.security")}
            </CardTitle>
            <CardDescription>{t("settings.managePrivacySecurity")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">{t("settings.currentPassword")}</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
              <Input id="new-password" type="password" />
            </div>
            <Button>{t("common.updatePassword")}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

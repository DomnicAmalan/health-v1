import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Users } from "lucide-react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsComponent,
});

function AnalyticsComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.ANALYTICS.VIEW} resource="analytics">
      <AnalyticsComponentInner />
    </ProtectedRoute>
  );
}

function AnalyticsComponentInner() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("analytics.patientVolume")}</h1>
        <p className="text-muted-foreground mt-2">{t("analytics.patientVolume")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("analytics.patientVolume")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">{t("analytics.activePatients")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("analytics.admissionRate")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.2%</div>
            <p className="text-xs text-muted-foreground">{t("analytics.thisMonth")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

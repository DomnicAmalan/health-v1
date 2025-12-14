import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, DollarSign, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/revenue")({
  component: RevenueComponent,
});

function RevenueComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.REVENUE.VIEW} resource="revenue">
      <RevenueComponentInner />
    </ProtectedRoute>
  );
}

function RevenueComponentInner() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("revenue.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("revenue.title")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("revenue.title")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$125,430</div>
            <p className="text-xs text-muted-foreground">+12% {t("dashboard.fromLastWeek")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("revenue.pendingClaims")}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">347</div>
            <p className="text-xs text-muted-foreground">{t("revenue.awaitingSubmission")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("revenue.arDays")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">{t("revenue.avgDaysOutstanding")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { Pill } from "lucide-react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/pharmacy")({
  component: PharmacyComponent,
});

function PharmacyComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.PHARMACY.VIEW} resource="pharmacy">
      <PharmacyComponentInner />
    </ProtectedRoute>
  );
}

function PharmacyComponentInner() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pharmacy.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("pharmacy.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("pharmacy.medicationManagement")}</CardTitle>
          <CardDescription>{t("pharmacy.prescriptionsAndOrders")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("common.comingSoon")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

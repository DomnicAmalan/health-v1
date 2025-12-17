import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import { Button } from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/orders")({
  component: OrdersComponent,
});

function OrdersComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.ORDERS.VIEW} resource="orders">
      <OrdersComponentInner />
    </ProtectedRoute>
  );
}

function OrdersComponentInner() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("orders.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("orders.subtitle")}</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("quickActions.enterOrder")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>{t("orders.laboratory")}</CardTitle>
            <CardDescription>{t("orders.labOrders")}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>{t("orders.radiology")}</CardTitle>
            <CardDescription>{t("orders.imagingStudies")}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>{t("orders.medications")}</CardTitle>
            <CardDescription>{t("orders.prescriptionOrders")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

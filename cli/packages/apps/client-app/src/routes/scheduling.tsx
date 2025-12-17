import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Plus } from "lucide-react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";

export const Route = createFileRoute("/scheduling")({
  component: SchedulingComponent,
});

function SchedulingComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.SCHEDULING.VIEW} resource="scheduling">
      <SchedulingComponentInner />
    </ProtectedRoute>
  );
}

function SchedulingComponentInner() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("scheduling.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("scheduling.subtitle")}</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("quickActions.scheduleAppointment")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("scheduling.title")}</CardTitle>
          <CardDescription>{t("scheduling.appointmentsToday")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("table.noData")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { Button } from "@lazarus-life/ui-components";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/clinical")({
  component: ClinicalComponent,
});

function ClinicalComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.CLINICAL.VIEW} resource="clinical">
      <ClinicalComponentInner />
    </ProtectedRoute>
  );
}

function ClinicalComponentInner() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("clinical.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("clinical.documentationTemplates")}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("quickActions.createClinicalNote")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("clinical.documentationTemplates")}</CardTitle>
          <CardDescription>{t("clinical.selectTemplate")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">{t("clinical.templates.progressNote")}</CardTitle>
                <CardDescription>{t("clinical.templates.progressNoteDesc")}</CardDescription>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">{t("clinical.templates.historyPhysical")}</CardTitle>
                <CardDescription>{t("clinical.templates.historyPhysicalDesc")}</CardDescription>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">{t("clinical.templates.dischargeSummary")}</CardTitle>
                <CardDescription>{t("clinical.templates.dischargeSummaryDesc")}</CardDescription>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">{t("clinical.templates.operativeReport")}</CardTitle>
                <CardDescription>{t("clinical.templates.operativeReportDesc")}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

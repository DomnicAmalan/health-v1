import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/results")({
  component: ResultsComponent,
});

function ResultsComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.RESULTS.VIEW} resource="results">
      <ResultsComponentInner />
    </ProtectedRoute>
  );
}

function ResultsComponentInner() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("results.title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("results.resultsRequiringReview")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("stats.resultsPendingReview")}
          </CardTitle>
          <CardDescription>{t("results.resultsRequiringReview")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">Patient: John Doe (MRN: 123456)</p>
                  <p className="text-sm text-muted-foreground">Complete Blood Count - Abnormal</p>
                </div>
                <Badge variant="destructive">{t("status.critical")}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

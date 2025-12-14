import { Card, CardContent, CardDescription, CardHeader, CardTitle, Stack, Alert, AlertDescription } from '@lazarus-life/ui-components';
import { useTranslation } from '@lazarus-life/shared/i18n';
import { AlertCircle, Globe } from 'lucide-react';

export function RealmsPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <Stack spacing="lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("realms.title")}</h1>
          <p className="text-muted-foreground">{t("navigation.realms")}</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">{t("realms.notImplemented")}</p>
              <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                <li>{t("realms.features.tenantIsolation")}</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t("realms.title")}
            </CardTitle>
            <CardDescription>
              {t("navigation.sections.multiTenancy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">{t("realms.comingSoon")}</p>
            </div>
          </CardContent>
        </Card>
      </Stack>
    </div>
  );
}

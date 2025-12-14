import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Stack,
} from "@lazarus-life/ui-components";
import { useTranslation } from "@lazarus-life/shared/i18n";
import { Building2, Plus, Search } from "lucide-react";
import { ProtectedPage, ProtectedButton } from "../lib/permissions";

export function OrganizationsPage() {
  const { t } = useTranslation();

  return (
    <ProtectedPage pageName="organizations" fallback={<div className="p-6">{t("errors.forbidden")}</div>}>
      <div className="p-6">
        <Stack spacing="lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t("navigation.organizations")}</h1>
              <p className="text-muted-foreground">{t("dashboard.organizations")}</p>
            </div>
            <ProtectedButton buttonId="create-organization">
              <Plus className="mr-2 h-4 w-4" />
              {t("common.create")} {t("navigation.organizations")}
            </ProtectedButton>
          </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("common.all")} {t("navigation.organizations")}</CardTitle>
                <CardDescription>{t("dashboard.totalOrganizations")}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t("search.organizations")} className="pl-8 w-64" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center py-12 text-center">
                <div className="space-y-2">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("table.noData")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Stack>
    </div>
    </ProtectedPage>
  );
}

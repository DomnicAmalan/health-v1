import { useTranslation } from "@lazarus-life/shared/i18n";
import { Card, CardDescription, CardHeader, CardTitle, Stack } from "@lazarus-life/ui-components";
import { Link } from "@tanstack/react-router";
import { BookOpen, FileText, Globe, Shield } from "lucide-react";

export function ComplianceIndexPage() {
  const { t } = useTranslation();

  const modules = [
    {
      title: t("compliance.regulations.title"),
      description: t("compliance.regulations.description"),
      icon: FileText,
      link: "/compliance/regulations",
    },
    {
      title: t("compliance.geographicRegions.title"),
      description: t("compliance.geographicRegions.description"),
      icon: Globe,
      link: "/compliance/geographic-regions",
    },
    {
      title: t("compliance.detection.title"),
      description: t("compliance.detection.description"),
      icon: Shield,
      link: "/compliance/detection",
    },
    {
      title: t("compliance.training.title"),
      description: t("compliance.training.description"),
      icon: BookOpen,
      link: "/compliance/training",
    },
  ];

  return (
    <Stack spacing="lg">
      <Stack spacing="xs">
        <h1 className="text-3xl font-bold">{t("compliance.title")}</h1>
        <p className="text-muted-foreground">{t("compliance.description")}</p>
      </Stack>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {modules.map((module) => (
          <Link key={module.link} to={module.link}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <module.icon className="h-5 w-5 text-primary" />
                  {module.title}
                </CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </Stack>
  );
}

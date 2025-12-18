import { useTranslation } from "@lazarus-life/shared/i18n";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lazarus-life/ui-components";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { apiClient } from "@/lib/api/client";

export const Route = createFileRoute("/compliance-status")({
  component: ComplianceStatusPage,
});

interface ComplianceAssessment {
  id: string;
  regulation_id: string;
  regulation_code: string;
  regulation_name: string;
  status: "compliant" | "non_compliant" | "partial" | "pending";
  score?: number;
  assessment_date: string;
  next_assessment_due?: string;
  gaps_count: number;
}

interface ComplianceGap {
  id: string;
  gap_description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "resolved" | "closed";
  target_resolution_date?: string;
}

function ComplianceStatusPage() {
  const { t } = useTranslation();

  // Fetch compliance assessments
  const { data: assessments, isLoading } = useQuery({
    queryKey: ["compliance-assessments"],
    queryFn: async (): Promise<ComplianceAssessment[]> => {
      // TODO: Replace with actual API endpoint
      return apiClient.get<ComplianceAssessment[]>("/compliance/assessments").catch(() => []);
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "non_compliant":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "partial":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "compliant":
        return "default";
      case "non_compliant":
        return "destructive";
      case "partial":
        return "secondary";
      default:
        return "outline";
    }
  };

  const compliantCount = assessments?.filter((a) => a.status === "compliant").length || 0;
  const nonCompliantCount = assessments?.filter((a) => a.status === "non_compliant").length || 0;
  const partialCount = assessments?.filter((a) => a.status === "partial").length || 0;
  const totalGaps = assessments?.reduce((sum, a) => sum + a.gaps_count, 0) || 0;

  return (
    <Stack spacing="lg">
      <Stack spacing="xs">
        <h1 className="text-3xl font-bold">{t("compliance.status.title", "Compliance Status")}</h1>
        <p className="text-muted-foreground">
          {t(
            "compliance.status.description",
            "View your organization's compliance status and gaps"
          )}
        </p>
      </Stack>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("compliance.status.compliant", "Compliant")}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compliantCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("compliance.status.nonCompliant", "Non-Compliant")}
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nonCompliantCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("compliance.status.partial", "Partial")}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partialCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("compliance.status.totalGaps", "Total Gaps")}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGaps}</div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Assessments Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("compliance.status.assessments", "Compliance Assessments")}</CardTitle>
          <CardDescription>
            {t(
              "compliance.status.assessmentsDescription",
              "Current compliance status for all applicable regulations"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">{t("common.loading", "Loading...")}</div>
            </div>
          ) : assessments && assessments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("compliance.status.regulation", "Regulation")}</TableHead>
                  <TableHead>{t("compliance.status.status", "Status")}</TableHead>
                  <TableHead>{t("compliance.status.score", "Score")}</TableHead>
                  <TableHead>{t("compliance.status.gaps", "Gaps")}</TableHead>
                  <TableHead>{t("compliance.status.assessmentDate", "Assessment Date")}</TableHead>
                  <TableHead>{t("compliance.status.nextDue", "Next Due")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{assessment.regulation_name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {assessment.regulation_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(assessment.status)}
                        <Badge variant={getStatusBadgeVariant(assessment.status)}>
                          {assessment.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {assessment.score !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{assessment.score}%</span>
                          <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                assessment.score >= 80
                                  ? "bg-green-600"
                                  : assessment.score >= 60
                                    ? "bg-yellow-600"
                                    : "bg-red-600"
                              }`}
                              style={{ width: `${assessment.score}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {assessment.gaps_count > 0 ? (
                        <Badge variant="destructive">{assessment.gaps_count}</Badge>
                      ) : (
                        <Badge variant="default">0</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(assessment.assessment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {assessment.next_assessment_due
                        ? new Date(assessment.next_assessment_due).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              {t("compliance.status.noAssessments", "No compliance assessments found")}
            </div>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

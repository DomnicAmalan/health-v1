/**
 * Lab Results View Component
 * Displays lab results with reference ranges and history
 */

import { memo } from "react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lazarus-life/ui-components";
import {
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
} from "lucide-react";
import type { LabResult, LabReport, ResultFlag } from "@lazarus-life/shared";

interface LabResultsViewProps {
  results: LabResult[];
  report?: LabReport;
  showHistory?: boolean;
}

const flagColors: Record<ResultFlag, string> = {
  normal: "text-green-600 bg-green-50",
  low: "text-blue-600 bg-blue-50",
  high: "text-amber-600 bg-amber-50",
  critical_low: "text-red-600 bg-red-50",
  critical_high: "text-red-600 bg-red-50",
  abnormal: "text-purple-600 bg-purple-50",
  positive: "text-amber-600 bg-amber-50",
  negative: "text-green-600 bg-green-50",
};

const flagIcons: Record<ResultFlag, React.ReactNode> = {
  normal: <CheckCircle className="h-4 w-4" />,
  low: <ArrowDown className="h-4 w-4" />,
  high: <ArrowUp className="h-4 w-4" />,
  critical_low: <AlertTriangle className="h-4 w-4" />,
  critical_high: <AlertTriangle className="h-4 w-4" />,
  abnormal: <AlertTriangle className="h-4 w-4" />,
  positive: <AlertTriangle className="h-4 w-4" />,
  negative: <CheckCircle className="h-4 w-4" />,
};

export const LabResultsView = memo(function LabResultsView({
  results,
  report,
}: LabResultsViewProps) {
  // Group results by category
  const groupedResults = results.reduce(
    (acc, result) => {
      const category = result.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      return acc;
    },
    {} as Record<string, LabResult[]>
  );

  const criticalCount = results.filter((r) => r.isCritical).length;
  const abnormalCount = results.filter(
    (r) => r.flag && r.flag !== "normal"
  ).length;

  return (
    <div className="space-y-6">
      {/* Report Header */}
      {report && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lab Report #{report.reportNumber}
              </CardTitle>
              <Badge
                variant={report.status === "final" ? "default" : "secondary"}
              >
                {report.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Patient</p>
                <p className="font-medium">{report.patientId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ordered By</p>
                <p className="font-medium">{report.orderingDoctorId || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Collection Date</p>
                <p className="font-medium">
                  {report.collectedAt
                    ? new Date(report.collectedAt).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Report Date</p>
                <p className="font-medium">
                  {report.signedAt
                    ? new Date(report.signedAt).toLocaleDateString()
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{results.length}</p>
              <p className="text-sm text-muted-foreground">Total Tests</p>
            </div>
          </CardContent>
        </Card>
        <Card className={abnormalCount > 0 ? "border-amber-200" : ""}>
          <CardContent className="pt-6">
            <div className="text-center">
              <p
                className={`text-3xl font-bold ${abnormalCount > 0 ? "text-amber-600" : ""}`}
              >
                {abnormalCount}
              </p>
              <p className="text-sm text-muted-foreground">Abnormal</p>
            </div>
          </CardContent>
        </Card>
        <Card className={criticalCount > 0 ? "border-red-200" : ""}>
          <CardContent className="pt-6">
            <div className="text-center">
              <p
                className={`text-3xl font-bold ${criticalCount > 0 ? "text-red-600" : ""}`}
              >
                {criticalCount}
              </p>
              <p className="text-sm text-muted-foreground">Critical</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results by Category */}
      {Object.entries(groupedResults).map(([category, categoryResults]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg capitalize">{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Test</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Reference Range</TableHead>
                  <TableHead>Flag</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryResults.map((result) => (
                  <TableRow
                    key={result.id}
                    className={result.isCritical ? "bg-red-50" : ""}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{result.testName}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.testCode}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-mono text-lg ${
                          result.isCritical
                            ? "font-bold text-red-600"
                            : result.flag && result.flag !== "normal"
                              ? "text-amber-600"
                              : ""
                        }`}
                      >
                        {result.value}
                      </span>
                      {result.unit && (
                        <span className="ml-1 text-muted-foreground">
                          {result.unit}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.referenceRange ? (
                        <span className="text-muted-foreground">
                          {result.referenceRange}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {result.flag && (
                        <Badge
                          className={`${flagColors[result.flag]} border-0`}
                        >
                          <span className="mr-1">{flagIcons[result.flag]}</span>
                          {result.flag.replace("_", " ")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.isVerified ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Comments */}
      {report?.comments && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{report.comments}</p>
          </CardContent>
        </Card>
      )}

      {/* Signature */}
      {report?.signedBy && (
        <div className="text-right text-sm text-muted-foreground">
          <p>
            Signed by: {report.signedBy}
            {report.signedAt && (
              <span> on {new Date(report.signedAt).toLocaleDateString()}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
});

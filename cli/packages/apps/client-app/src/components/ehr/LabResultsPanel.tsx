/**
 * LabResultsPanel Component
 * Displays patient's lab results with reference ranges
 */

import type { EhrLabResult } from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lazarus-life/ui-components";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className || ""}`} />
);
import { cn } from "@lazarus-life/ui-components/utils";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Beaker,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Plus,
} from "lucide-react";
import { memo, useState } from "react";
import { useEhrPatientLabs, useEhrActionableLabs } from "@/hooks/api/ehr";

interface LabResultsPanelProps {
  patientId: string;
  onOrderLab?: () => void;
  onViewResult?: (result: EhrLabResult) => void;
  showActionable?: boolean;
  compact?: boolean;
  className?: string;
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ResultStatusBadge({ status }: { status: EhrLabResult["status"] }) {
  const variants: Record<
    EhrLabResult["status"],
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    pending: { variant: "secondary", label: "Pending" },
    in_progress: { variant: "default", label: "In Progress" },
    completed: { variant: "outline", label: "Completed" },
    cancelled: { variant: "destructive", label: "Cancelled" },
  };

  const { variant, label } = variants[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function AbnormalFlag({ flag }: { flag?: EhrLabResult["abnormalFlag"] }) {
  if (!flag || flag === "normal") return null;

  const config: Record<
    NonNullable<EhrLabResult["abnormalFlag"]>,
    { icon: typeof ArrowUp; color: string; label: string }
  > = {
    normal: { icon: ArrowUp, color: "", label: "" },
    high: { icon: ArrowUp, color: "text-destructive", label: "High" },
    low: { icon: ArrowDown, color: "text-blue-600", label: "Low" },
    critical_high: { icon: ArrowUp, color: "text-destructive", label: "Critical High" },
    critical_low: { icon: ArrowDown, color: "text-destructive", label: "Critical Low" },
    abnormal: { icon: AlertCircle, color: "text-yellow-600", label: "Abnormal" },
  };

  const { icon: Icon, color, label } = config[flag];
  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant={flag.includes("critical") ? "destructive" : "secondary"} className="text-xs">
          <Icon className={cn("h-3 w-3 mr-1", color)} />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{label} result</TooltipContent>
    </Tooltip>
  );
}

interface LabResultRowProps {
  result: EhrLabResult;
  onView?: (result: EhrLabResult) => void;
  compact?: boolean;
}

const LabResultRow = memo(function LabResultRow({ result, onView, compact }: LabResultRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isCritical = result.abnormalFlag?.includes("critical");
  const isAbnormal = result.abnormalFlag && result.abnormalFlag !== "normal";

  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer hover:bg-accent/50",
          isCritical && "bg-destructive/10",
          isAbnormal && !isCritical && "bg-yellow-50"
        )}
        onClick={() => onView?.(result)}
      >
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell>
          <Box>
            <span className="font-medium">{result.testName}</span>
            {result.loincCode && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">
                    [{result.loincCode}]
                  </span>
                </TooltipTrigger>
                <TooltipContent>LOINC Code</TooltipContent>
              </Tooltip>
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Flex align="center" gap="sm">
            <span className={cn("font-medium", isAbnormal && "text-destructive")}>
              {result.value}
            </span>
            <span className="text-muted-foreground text-sm">{result.unit}</span>
            <AbnormalFlag flag={result.abnormalFlag} />
          </Flex>
        </TableCell>
        {!compact && (
          <>
            <TableCell className="text-muted-foreground text-sm">
              {result.referenceRange || "—"}
            </TableCell>
            <TableCell>
              <ResultStatusBadge status={result.status} />
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {result.collectedAt ? formatDateTime(result.collectedAt) : "—"}
            </TableCell>
          </>
        )}
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={compact ? 3 : 6} className="py-2">
            <Box className="text-sm space-y-1 pl-8">
              {result.specimenType && (
                <p>
                  <span className="text-muted-foreground">Specimen:</span> {result.specimenType}
                </p>
              )}
              {result.performingLab && (
                <p>
                  <span className="text-muted-foreground">Lab:</span> {result.performingLab}
                </p>
              )}
              {result.collectedAt && (
                <p>
                  <span className="text-muted-foreground">Collected:</span>{" "}
                  {formatDateTime(result.collectedAt)}
                </p>
              )}
              {result.resultedAt && (
                <p>
                  <span className="text-muted-foreground">Resulted:</span>{" "}
                  {formatDateTime(result.resultedAt)}
                </p>
              )}
              {result.interpretation && (
                <p>
                  <span className="text-muted-foreground">Interpretation:</span>{" "}
                  {result.interpretation}
                </p>
              )}
              {result.notes && (
                <p className="italic text-muted-foreground">{result.notes}</p>
              )}
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

export const LabResultsPanel = memo(function LabResultsPanel({
  patientId,
  onOrderLab,
  onViewResult,
  showActionable: _showActionable = false,
  compact = false,
  className,
}: LabResultsPanelProps) {
  const {
    data: labResults,
    isLoading,
    error,
  } = useEhrPatientLabs(patientId, { limit: 20, offset: 0 });

  const { data: _actionableLabs } = useEhrActionableLabs();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Lab Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Lab Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load lab results</p>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const results = labResults?.items ?? [];
  const abnormalCount = results.filter(
    (r) => r.abnormalFlag && r.abnormalFlag !== "normal"
  ).length;
  const criticalCount = results.filter((r) => r.abnormalFlag?.includes("critical")).length;
  const pendingCount = results.filter((r) => r.status === "pending").length;

  return (
    <Card className={cn(criticalCount > 0 && "border-destructive", className)}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <Beaker className={cn("h-5 w-5", criticalCount > 0 && "text-destructive")} />
            Lab Results
            {criticalCount > 0 && (
              <Badge variant="destructive">{criticalCount} critical</Badge>
            )}
            {abnormalCount > 0 && criticalCount === 0 && (
              <Badge variant="secondary">{abnormalCount} abnormal</Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          {onOrderLab && (
            <Button variant="outline" size="sm" onClick={onOrderLab}>
              <Plus className="h-4 w-4 mr-1" />
              Order
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <Box className="text-center text-muted-foreground py-8">
            <Beaker className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No lab results found</p>
          </Box>
        ) : (
          <Box className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Result</TableHead>
                  {!compact && (
                    <>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Collected</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <LabResultRow
                    key={result.id}
                    result={result}
                    onView={onViewResult}
                    compact={compact}
                  />
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {results.length > 0 && labResults?.total && labResults.total > results.length && (
          <Box className="mt-4 text-center">
            <Button variant="link" size="sm">
              View all {labResults.total} results
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

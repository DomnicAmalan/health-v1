/**
 * ProblemList Component
 * Displays patient's problem list with ICD-10 codes
 */

import type { EhrProblem } from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
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
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
  Stethoscope,
} from "lucide-react";
import { memo, useState } from "react";
import { useEhrPatientProblems } from "@/hooks/api/ehr";

interface ProblemListProps {
  patientId: string;
  showInactive?: boolean;
  onAddProblem?: () => void;
  onSelectProblem?: (problem: EhrProblem) => void;
  compact?: boolean;
  className?: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ProblemStatusIcon({ status }: { status: EhrProblem["status"] }) {
  switch (status) {
    case "active":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "resolved":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "inactive":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
}

function ProblemAcuityBadge({ acuity }: { acuity: EhrProblem["acuity"] }) {
  const variants: Record<EhrProblem["acuity"], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    acute: { variant: "destructive", label: "Acute" },
    chronic: { variant: "default", label: "Chronic" },
  };

  const { variant, label } = variants[acuity];
  return <Badge variant={variant}>{label}</Badge>;
}

interface ProblemItemProps {
  problem: EhrProblem;
  onSelect?: (problem: EhrProblem) => void;
  compact?: boolean;
}

const ProblemItem = memo(function ProblemItem({ problem, onSelect, compact }: ProblemItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      className={cn(
        "border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer",
        problem.status === "resolved" && "opacity-60"
      )}
      onClick={() => onSelect?.(problem)}
    >
      <Flex align="start" gap="sm">
        <ProblemStatusIcon status={problem.status} />
        <Box className="flex-1 min-w-0">
          <Flex align="center" gap="sm" className="mb-1">
            <span className="font-medium truncate">{problem.description}</span>
            <ProblemAcuityBadge acuity={problem.acuity} />
          </Flex>

          {!compact && (
            <>
              <Flex gap="md" className="text-sm text-muted-foreground">
                {problem.icd10Code && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-mono bg-muted px-1 rounded text-xs">
                        {problem.icd10Code}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>ICD-10 Code</TooltipContent>
                  </Tooltip>
                )}
                {problem.onsetDate && <span>Onset: {formatDate(problem.onsetDate)}</span>}
                {problem.resolvedDate && (
                  <span>Resolved: {formatDate(problem.resolvedDate)}</span>
                )}
              </Flex>

              {problem.notes && (
                <Box className="mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(!expanded);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {expanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    Notes
                  </button>
                  {expanded && (
                    <p className="text-sm text-muted-foreground mt-1 pl-4">{problem.notes}</p>
                  )}
                </Box>
              )}
            </>
          )}
        </Box>
      </Flex>
    </Box>
  );
});

export const ProblemList = memo(function ProblemList({
  patientId,
  showInactive = false,
  onAddProblem,
  onSelectProblem,
  compact = false,
  className,
}: ProblemListProps) {
  const { data: problems, isLoading, error } = useEhrPatientProblems(patientId, showInactive);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Problems
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Problems
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load problems</p>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Extract array from response (handle both array and paginated format)
  const problemList = Array.isArray(problems) ? problems : (problems?.items || []);

  const activeProblems = problemList.filter((p) => p.status === "active");
  const inactiveProblems = problemList.filter((p) => p.status !== "active");

  return (
    <Card className={className}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Problems
            {activeProblems.length > 0 && (
              <Badge variant="secondary">{activeProblems.length} active</Badge>
            )}
          </CardTitle>
          {onAddProblem && (
            <Button variant="outline" size="sm" onClick={onAddProblem}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardContent>
        {problemList.length === 0 ? (
          <Box className="text-center text-muted-foreground py-8">
            <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No problems documented</p>
          </Box>
        ) : (
          <Box className="space-y-2">
            {activeProblems.map((problem) => (
              <ProblemItem
                key={problem.id}
                problem={problem}
                onSelect={onSelectProblem}
                compact={compact}
              />
            ))}
            {showInactive && inactiveProblems.length > 0 && (
              <>
                <Box className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4 mb-2">
                  Inactive / Resolved
                </Box>
                {inactiveProblems.map((problem) => (
                  <ProblemItem
                    key={problem.id}
                    problem={problem}
                    onSelect={onSelectProblem}
                    compact={compact}
                  />
                ))}
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * AllergyList Component
 * Displays patient's allergies with severity indicators
 */

import type { EhrAllergy } from "@lazarus-life/shared/types/ehr";
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
  AlertTriangle,
  CheckCircle,
  Info,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { memo } from "react";
import { useEhrPatientAllergies, useVerifyEhrAllergy, useDeleteEhrAllergy } from "@/hooks/api/ehr";

interface AllergyListProps {
  patientId: string;
  onAddAllergy?: () => void;
  onSelectAllergy?: (allergy: EhrAllergy) => void;
  showActions?: boolean;
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

function SeverityIcon({ severity }: { severity: EhrAllergy["severity"] }) {
  switch (severity) {
    case "life_threatening":
      return <ShieldAlert className="h-4 w-4 text-destructive" />;
    case "severe":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "moderate":
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case "mild":
      return <Info className="h-4 w-4 text-blue-600" />;
    default:
      return null;
  }
}

function SeverityBadge({ severity }: { severity: EhrAllergy["severity"] }) {
  const variants: Record<
    EhrAllergy["severity"],
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    life_threatening: { variant: "destructive", label: "Life Threatening" },
    severe: { variant: "destructive", label: "Severe" },
    moderate: { variant: "default", label: "Moderate" },
    mild: { variant: "secondary", label: "Mild" },
  };

  const { variant, label } = variants[severity];
  return <Badge variant={variant}>{label}</Badge>;
}

function AllergyTypeBadge({ type }: { type: EhrAllergy["allergyType"] }) {
  const labels: Record<EhrAllergy["allergyType"], string> = {
    drug: "Drug",
    food: "Food",
    environmental: "Environmental",
    other: "Other",
  };
  return (
    <Badge variant="outline" className="text-xs">
      {labels[type]}
    </Badge>
  );
}

interface AllergyItemProps {
  allergy: EhrAllergy;
  onSelect?: (allergy: EhrAllergy) => void;
  onVerify?: (id: string) => void;
  onDelete?: (id: string, patientId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

const AllergyItem = memo(function AllergyItem({
  allergy,
  onSelect,
  onVerify,
  onDelete,
  showActions = false,
  compact,
}: AllergyItemProps) {
  return (
    <Box
      className={cn(
        "border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer",
        allergy.severity === "life_threatening" && "border-destructive bg-destructive/5",
        allergy.severity === "severe" && "border-destructive/50 bg-destructive/5"
      )}
      onClick={() => onSelect?.(allergy)}
    >
      <Flex align="start" gap="sm">
        <SeverityIcon severity={allergy.severity} />
        <Box className="flex-1 min-w-0">
          <Flex align="center" gap="sm" className="mb-1 flex-wrap">
            <span className="font-medium">{allergy.allergen}</span>
            <AllergyTypeBadge type={allergy.allergyType} />
            <SeverityBadge severity={allergy.severity} />
            {allergy.verifiedAt && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Verified on {formatDate(allergy.verifiedAt)}
                  {allergy.verifiedByName && ` by ${allergy.verifiedByName}`}
                </TooltipContent>
              </Tooltip>
            )}
          </Flex>

          {!compact && (
            <>
              {allergy.reactions && allergy.reactions.length > 0 && (
                <Box className="text-sm text-muted-foreground mb-1">
                  <span className="font-medium">Reactions: </span>
                  {allergy.reactions.join(", ")}
                </Box>
              )}

              <Flex gap="md" className="text-xs text-muted-foreground">
                {allergy.onsetDate && <span>Onset: {formatDate(allergy.onsetDate)}</span>}
                {allergy.source && <span>Source: {allergy.source}</span>}
              </Flex>

              {allergy.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">{allergy.notes}</p>
              )}

              {showActions && !allergy.verifiedAt && (
                <Flex gap="sm" className="mt-2">
                  {onVerify && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVerify(allergy.id);
                      }}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verify
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(allergy.id, allergy.patientId);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </Flex>
              )}
            </>
          )}
        </Box>
      </Flex>
    </Box>
  );
});

export const AllergyList = memo(function AllergyList({
  patientId,
  onAddAllergy,
  onSelectAllergy,
  showActions = false,
  compact = false,
  className,
}: AllergyListProps) {
  const { data: allergies, isLoading, error } = useEhrPatientAllergies(patientId);
  const verifyMutation = useVerifyEhrAllergy();
  const deleteMutation = useDeleteEhrAllergy();

  const handleVerify = (id: string) => {
    verifyMutation.mutate(id);
  };

  const handleDelete = (id: string, patientId: string) => {
    if (confirm("Are you sure you want to remove this allergy?")) {
      deleteMutation.mutate({ id, patientId });
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Allergies
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
            <AlertTriangle className="h-5 w-5" />
            Allergies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load allergies</p>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Extract array from response (handle both array and paginated format)
  const allergyList = Array.isArray(allergies) ? allergies : (allergies?.items || []);

  // Sort by severity (most severe first)
  const sortedAllergies = [...allergyList].sort((a, b) => {
    const severityOrder = { life_threatening: 0, severe: 1, moderate: 2, mild: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const severeCount = sortedAllergies.filter(
    (a) => a.severity === "severe" || a.severity === "life_threatening"
  ).length;

  return (
    <Card className={cn(severeCount > 0 && "border-destructive", className)}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className={cn("h-5 w-5", severeCount > 0 && "text-destructive")} />
            Allergies
            {sortedAllergies.length > 0 && (
              <Badge variant={severeCount > 0 ? "destructive" : "secondary"}>
                {sortedAllergies.length}
              </Badge>
            )}
          </CardTitle>
          {onAddAllergy && (
            <Button variant="outline" size="sm" onClick={onAddAllergy}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardContent>
        {sortedAllergies.length === 0 ? (
          <Box className="text-center py-8">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="text-green-600 font-medium">No Known Allergies (NKA)</p>
          </Box>
        ) : (
          <Box className="space-y-2">
            {sortedAllergies.map((allergy) => (
              <AllergyItem
                key={allergy.id}
                allergy={allergy}
                onSelect={onSelectAllergy}
                onVerify={showActions ? handleVerify : undefined}
                onDelete={showActions ? handleDelete : undefined}
                showActions={showActions}
                compact={compact}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

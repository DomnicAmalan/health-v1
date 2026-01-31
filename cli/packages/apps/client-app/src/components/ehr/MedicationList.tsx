/**
 * MedicationList Component
 * Displays patient's current and historical medications
 */

import type { EhrMedication } from "@lazarus-life/shared/types/ehr";
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
  Clock,
  Pause,
  Pill,
  Plus,
  XCircle,
} from "lucide-react";
import { memo } from "react";
import { useEhrPatientMedications, useDiscontinueEhrMedication } from "@/hooks/api/ehr";

interface MedicationListProps {
  patientId: string;
  activeOnly?: boolean;
  onAddMedication?: () => void;
  onSelectMedication?: (medication: EhrMedication) => void;
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

function MedicationStatusIcon({ status }: { status: EhrMedication["status"] }) {
  switch (status) {
    case "active":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "on_hold":
      return <Pause className="h-4 w-4 text-yellow-600" />;
    case "discontinued":
    case "cancelled":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "completed":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
}

interface MedicationItemProps {
  medication: EhrMedication;
  onSelect?: (medication: EhrMedication) => void;
  onDiscontinue?: (id: string) => void;
  compact?: boolean;
}

const MedicationItem = memo(function MedicationItem({
  medication,
  onSelect,
  onDiscontinue,
  compact,
}: MedicationItemProps) {
  return (
    <Box
      className={cn(
        "border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer",
        medication.status !== "active" && "opacity-60"
      )}
      onClick={() => onSelect?.(medication)}
    >
      <Flex align="start" gap="sm">
        <MedicationStatusIcon status={medication.status} />
        <Box className="flex-1 min-w-0">
          <Flex align="center" gap="sm" className="mb-1">
            <span className="font-medium truncate">{medication.drugName}</span>
            {medication.medicationType === "prn" && (
              <Badge variant="outline" className="text-xs">
                PRN
              </Badge>
            )}
            {medication.status === "on_hold" && (
              <Badge variant="secondary">On Hold</Badge>
            )}
          </Flex>

          {!compact && (
            <>
              <p className="text-sm text-muted-foreground">
                {medication.dosage} {medication.route} {medication.frequency}
              </p>

              <Flex gap="md" className="text-xs text-muted-foreground mt-1">
                {medication.rxnormCode && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-mono bg-muted px-1 rounded">
                        {medication.rxnormCode}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>RxNorm Code</TooltipContent>
                  </Tooltip>
                )}
                <span>Started: {formatDate(medication.startDate)}</span>
                {medication.endDate && (
                  <span>Ends: {formatDate(medication.endDate)}</span>
                )}
                {medication.refillsRemaining !== undefined && medication.refillsRemaining >= 0 && (
                  <span>{medication.refillsRemaining} refills remaining</span>
                )}
              </Flex>

              {medication.instructions && (
                <p className="text-xs text-muted-foreground mt-1">
                  Instructions: {medication.instructions}
                </p>
              )}

              {medication.status === "active" && onDiscontinue && (
                <Box className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDiscontinue(medication.id);
                    }}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Discontinue
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Flex>
    </Box>
  );
});

export const MedicationList = memo(function MedicationList({
  patientId,
  activeOnly = true,
  onAddMedication,
  onSelectMedication,
  compact = false,
  className,
}: MedicationListProps) {
  const { data: medications, isLoading, error } = useEhrPatientMedications(patientId, activeOnly);
  const discontinueMutation = useDiscontinueEhrMedication();

  const handleDiscontinue = (id: string) => {
    if (confirm("Are you sure you want to discontinue this medication?")) {
      discontinueMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
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
            <Pill className="h-5 w-5" />
            Medications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load medications</p>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const activeMeds = medications?.filter((m) => m.status === "active") ?? [];
  const otherMeds = medications?.filter((m) => m.status !== "active") ?? [];

  return (
    <Card className={className}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medications
            {activeMeds.length > 0 && (
              <Badge variant="secondary">{activeMeds.length} active</Badge>
            )}
          </CardTitle>
          {onAddMedication && (
            <Button variant="outline" size="sm" onClick={onAddMedication}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardContent>
        {medications?.length === 0 ? (
          <Box className="text-center text-muted-foreground py-8">
            <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No medications documented</p>
          </Box>
        ) : (
          <Box className="space-y-2">
            {activeMeds.map((medication) => (
              <MedicationItem
                key={medication.id}
                medication={medication}
                onSelect={onSelectMedication}
                onDiscontinue={handleDiscontinue}
                compact={compact}
              />
            ))}
            {!activeOnly && otherMeds.length > 0 && (
              <>
                <Box className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4 mb-2">
                  Discontinued / Expired
                </Box>
                {otherMeds.map((medication) => (
                  <MedicationItem
                    key={medication.id}
                    medication={medication}
                    onSelect={onSelectMedication}
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

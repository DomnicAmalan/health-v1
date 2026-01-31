/**
 * VisitList Component
 * Displays patient's visits/encounters
 */

import type { EhrVisit } from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
} from "@lazarus-life/ui-components";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className || ""}`} />
);
import { cn } from "@lazarus-life/ui-components/utils";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Plus,
  User,
} from "lucide-react";
import { memo } from "react";
import { useEhrPatientVisits } from "@/hooks/api/ehr";

interface VisitListProps {
  patientId: string;
  onAddVisit?: () => void;
  onSelectVisit?: (visit: EhrVisit) => void;
  compact?: boolean;
  className?: string;
  limit?: number;
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function VisitStatusBadge({ status }: { status: EhrVisit["status"] }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    scheduled: { variant: "outline", label: "Scheduled" },
    checked_in: { variant: "secondary", label: "Checked In" },
    in_progress: { variant: "default", label: "In Progress" },
    completed: { variant: "secondary", label: "Completed" },
    cancelled: { variant: "destructive", label: "Cancelled" },
    no_show: { variant: "destructive", label: "No Show" },
  };

  const config = variants[status] || { variant: "outline" as const, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function VisitTypeIcon({ visitType }: { visitType: string }) {
  const color = visitType === "emergency" ? "text-destructive" : "text-primary";
  return <Calendar className={cn("h-4 w-4", color)} />;
}

interface VisitItemProps {
  visit: EhrVisit;
  onSelect?: (visit: EhrVisit) => void;
  compact?: boolean;
}

const VisitItem = memo(function VisitItem({
  visit,
  onSelect,
  compact,
}: VisitItemProps) {
  const isActive = visit.status === "checked_in" || visit.status === "in_progress";

  return (
    <Box
      className={cn(
        "border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer",
        isActive && "border-primary/50 bg-primary/5"
      )}
      onClick={() => onSelect?.(visit)}
    >
      <Flex align="start" gap="sm">
        <VisitTypeIcon visitType={visit.visitType} />
        <Box className="flex-1 min-w-0">
          <Flex align="center" gap="sm" className="mb-1">
            <span className="font-medium capitalize">{visit.visitType.replace("_", " ")}</span>
            <VisitStatusBadge status={visit.status} />
          </Flex>

          {!compact && (
            <>
              <Flex gap="md" className="text-sm text-muted-foreground mt-1">
                <Flex align="center" gap="xs">
                  <Clock className="h-3 w-3" />
                  <span>{formatDateTime(visit.visitDatetime)}</span>
                </Flex>
              </Flex>

              {visit.locationName && (
                <Flex align="center" gap="xs" className="text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{visit.locationName}</span>
                </Flex>
              )}

              {visit.providerName && (
                <Flex align="center" gap="xs" className="text-sm text-muted-foreground mt-1">
                  <User className="h-3 w-3" />
                  <span>{visit.providerName}</span>
                </Flex>
              )}

              {visit.chiefComplaint && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  "{visit.chiefComplaint}"
                </p>
              )}
            </>
          )}
        </Box>
        {isActive && <CheckCircle className="h-4 w-4 text-primary" />}
      </Flex>
    </Box>
  );
});

export const VisitList = memo(function VisitList({
  patientId,
  onAddVisit,
  onSelectVisit,
  compact = false,
  className,
  limit,
}: VisitListProps) {
  const { data, isLoading, error } = useEhrPatientVisits(patientId, limit ? { limit, offset: 0 } : undefined);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Visits
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
            <Calendar className="h-5 w-5" />
            Visits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load visits</p>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const visits = data?.items ?? [];
  const activeVisits = visits.filter(
    (v) => v.status === "checked_in" || v.status === "in_progress"
  );

  return (
    <Card className={className}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Visits
            {activeVisits.length > 0 && (
              <Badge variant="default">{activeVisits.length} active</Badge>
            )}
          </CardTitle>
          {onAddVisit && (
            <Button variant="outline" size="sm" onClick={onAddVisit}>
              <Plus className="h-4 w-4 mr-1" />
              New Visit
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardContent>
        {visits.length === 0 ? (
          <Box className="text-center text-muted-foreground py-8">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No visits recorded</p>
          </Box>
        ) : (
          <Box className="space-y-2">
            {visits.map((visit) => (
              <VisitItem
                key={visit.id}
                visit={visit}
                onSelect={onSelectVisit}
                compact={compact}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * InteractionAlert Component
 * Displays drug interaction, contraindication, and allergy warnings
 */

import type {
  InteractionCheckResponse,
  DrugInteraction,
  DrugContraindication,
  AllergyAlert,
  InteractionSeverity,
} from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Info,
  Pill,
  ShieldAlert,
} from "lucide-react";
import { memo, useState } from "react";

interface InteractionAlertProps {
  interactions: InteractionCheckResponse | null | undefined;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
}

const SEVERITY_CONFIG: Record<
  InteractionSeverity,
  { icon: typeof AlertTriangle; color: string; bgColor: string; label: string }
> = {
  minor: {
    icon: Info,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    label: "Minor",
  },
  moderate: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    label: "Moderate",
  },
  major: {
    icon: AlertCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    label: "Major",
  },
  contraindicated: {
    icon: Ban,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    label: "Contraindicated",
  },
};

function InteractionItem({
  interaction,
  compact,
}: {
  interaction: DrugInteraction;
  compact?: boolean;
}) {
  const config = SEVERITY_CONFIG[interaction.severity];
  const Icon = config.icon;

  return (
    <Box className={cn("border rounded-lg p-3", config.bgColor)}>
      <Flex align="start" gap="sm">
        <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.color)} />
        <Box className="flex-1 min-w-0">
          <Flex align="center" gap="sm" className="mb-1">
            <span className="font-medium">
              {interaction.drugAName} + {interaction.drugBName}
            </span>
            <Badge
              variant={
                interaction.severity === "contraindicated"
                  ? "destructive"
                  : interaction.severity === "major"
                    ? "destructive"
                    : "secondary"
              }
            >
              {config.label}
            </Badge>
          </Flex>
          <p className="text-sm text-muted-foreground">
            {interaction.description}
          </p>
          {!compact && interaction.management && (
            <p className="text-sm mt-2">
              <span className="font-medium">Management:</span>{" "}
              {interaction.management}
            </p>
          )}
        </Box>
      </Flex>
    </Box>
  );
}

function ContraindicationItem({
  contraindication,
  compact,
}: {
  contraindication: DrugContraindication;
  compact?: boolean;
}) {
  const config = SEVERITY_CONFIG[contraindication.severity];
  const Icon = config.icon;

  return (
    <Box className={cn("border rounded-lg p-3", config.bgColor)}>
      <Flex align="start" gap="sm">
        <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.color)} />
        <Box className="flex-1 min-w-0">
          <Flex align="center" gap="sm" className="mb-1">
            <span className="font-medium">{contraindication.drugName}</span>
            <Badge variant={contraindication.isAbsolute ? "destructive" : "secondary"}>
              {contraindication.isAbsolute ? "Absolute" : "Relative"}
            </Badge>
          </Flex>
          <p className="text-sm">
            <span className="text-muted-foreground">Condition:</span>{" "}
            {contraindication.condition}
          </p>
          {!compact && (
            <p className="text-sm text-muted-foreground mt-1">
              {contraindication.description}
            </p>
          )}
        </Box>
      </Flex>
    </Box>
  );
}

function AllergyAlertItem({
  alert,
}: {
  alert: AllergyAlert;
}) {
  return (
    <Box className="border rounded-lg p-3 bg-destructive/10 border-destructive/30">
      <Flex align="start" gap="sm">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
        <Box className="flex-1 min-w-0">
          <Flex align="center" gap="sm" className="mb-1">
            <span className="font-medium text-destructive">
              Allergy Alert: {alert.drugName}
            </span>
            <Badge variant="destructive">{alert.severity}</Badge>
          </Flex>
          <p className="text-sm">
            Patient is allergic to{" "}
            <span className="font-medium">{alert.allergen}</span>
            {alert.matchType !== "exact" && (
              <span className="text-muted-foreground">
                {" "}
                ({alert.matchType} match)
              </span>
            )}
          </p>
        </Box>
      </Flex>
    </Box>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  count,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Box className="border-b last:border-b-0">
      <Button
        variant="ghost"
        className="w-full justify-start py-2 px-0 h-auto hover:bg-transparent"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Flex align="center" gap="sm" className="w-full">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {icon}
          <span>{title}</span>
          <Badge variant="secondary">{count}</Badge>
        </Flex>
      </Button>
      {isOpen && <Box className="space-y-2 pb-3">{children}</Box>}
    </Box>
  );
}

export const InteractionAlert = memo(function InteractionAlert({
  interactions,
  isLoading,
  compact = false,
  className,
}: InteractionAlertProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-4">
          <Flex align="center" justify="center" gap="sm" className="text-muted-foreground">
            <Pill className="h-5 w-5 animate-pulse" />
            <span>Checking interactions...</span>
          </Flex>
        </CardContent>
      </Card>
    );
  }

  if (!interactions) {
    return null;
  }

  const {
    drugInteractions,
    contraindications,
    allergyAlerts,
    hasCritical,
    summary,
  } = interactions;

  const totalIssues =
    drugInteractions.length + contraindications.length + allergyAlerts.length;

  if (totalIssues === 0) {
    return (
      <Alert className={cn("border-green-200 bg-green-50 dark:bg-green-950/30", className)}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700 dark:text-green-400">
          No Interactions Found
        </AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-300">
          No drug interactions, contraindications, or allergy conflicts detected.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card
      className={cn(
        hasCritical && "border-destructive",
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {hasCritical ? (
            <Ban className="h-5 w-5 text-destructive" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          )}
          <span className={cn(hasCritical && "text-destructive")}>
            {hasCritical ? "Critical Alerts" : "Interaction Warnings"}
          </span>
          <Badge variant={hasCritical ? "destructive" : "secondary"}>
            {totalIssues}
          </Badge>
        </CardTitle>
        {summary && (
          <p className="text-sm text-muted-foreground mt-1">{summary}</p>
        )}
      </CardHeader>

      <CardContent>
        <Box className="space-y-2">
          {/* Allergy Alerts - Always show first if any */}
          {allergyAlerts.length > 0 && (
            <CollapsibleSection
              title="Allergy Alerts"
              icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
              count={allergyAlerts.length}
              defaultOpen
            >
              {allergyAlerts.map((alert, idx) => (
                <AllergyAlertItem key={idx} alert={alert} />
              ))}
            </CollapsibleSection>
          )}

          {/* Drug Interactions */}
          {drugInteractions.length > 0 && (
            <CollapsibleSection
              title="Drug Interactions"
              icon={<Pill className="h-4 w-4" />}
              count={drugInteractions.length}
              defaultOpen
            >
              {drugInteractions.map((interaction) => (
                <InteractionItem
                  key={interaction.id}
                  interaction={interaction}
                  compact={compact}
                />
              ))}
            </CollapsibleSection>
          )}

          {/* Contraindications */}
          {contraindications.length > 0 && (
            <CollapsibleSection
              title="Contraindications"
              icon={<Ban className="h-4 w-4" />}
              count={contraindications.length}
            >
              {contraindications.map((ci) => (
                <ContraindicationItem
                  key={ci.id}
                  contraindication={ci}
                  compact={compact}
                />
              ))}
            </CollapsibleSection>
          )}
        </Box>
      </CardContent>
    </Card>
  );
});

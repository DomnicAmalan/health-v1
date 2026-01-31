/**
 * VitalSignsPanel Component
 * Displays patient's vital signs with trends
 */

import type { EhrVitalType } from "@lazarus-life/shared/types/ehr";
import { VITAL_UNITS } from "@lazarus-life/shared/types/ehr";
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
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Heart,
  Plus,
  Thermometer,
  Wind,
} from "lucide-react";
import { memo } from "react";
import { useEhrLatestVitals } from "@/hooks/api/ehr";

// Display names for vital types
const VITAL_DISPLAY_NAMES: Record<EhrVitalType, string> = {
  blood_pressure: "Blood Pressure",
  heart_rate: "Heart Rate",
  temperature: "Temperature",
  respiratory_rate: "Respiratory Rate",
  oxygen_saturation: "SpO2",
  height: "Height",
  weight: "Weight",
  bmi: "BMI",
  pain: "Pain Level",
};

// Reference ranges for vitals (normal ranges)
const VITAL_REFERENCE_RANGES: Record<string, { low: number; high: number }> = {
  blood_pressure_systolic: { low: 90, high: 140 },
  blood_pressure_diastolic: { low: 60, high: 90 },
  heart_rate: { low: 60, high: 100 },
  temperature: { low: 97, high: 99.5 },
  respiratory_rate: { low: 12, high: 20 },
  oxygen_saturation: { low: 95, high: 100 },
  pain: { low: 0, high: 3 },
};

interface VitalSignsPanelProps {
  patientId: string;
  onAddVitals?: () => void;
  onViewTrend?: (vitalType: EhrVitalType) => void;
  compact?: boolean;
  className?: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function VitalIcon({ type }: { type: EhrVitalType }) {
  switch (type) {
    case "heart_rate":
    case "blood_pressure":
      return <Heart className="h-4 w-4" />;
    case "temperature":
      return <Thermometer className="h-4 w-4" />;
    case "respiratory_rate":
    case "oxygen_saturation":
      return <Wind className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function isAbnormal(type: string, value: number): "high" | "low" | null {
  const range = VITAL_REFERENCE_RANGES[type];
  if (!range) return null;
  if (value < range.low) return "low";
  if (value > range.high) return "high";
  return null;
}

interface VitalCardProps {
  label: string;
  value: string | number;
  unit: string;
  type: EhrVitalType;
  timestamp?: string;
  onViewTrend?: () => void;
  compact?: boolean;
}

const VitalCard = memo(function VitalCard({
  label,
  value,
  unit,
  type,
  timestamp,
  onViewTrend,
  compact,
}: VitalCardProps) {
  const numericValue = typeof value === "string" ? parseFloat(value.split("/")[0] ?? "0") : value;
  const abnormal = type === "blood_pressure"
    ? isAbnormal("blood_pressure_systolic", numericValue)
    : isAbnormal(type, numericValue);

  return (
    <Box
      className={cn(
        "border rounded-lg p-3 transition-colors",
        abnormal === "high" && "border-destructive/50 bg-destructive/5",
        abnormal === "low" && "border-blue-500/50 bg-blue-50 dark:bg-blue-950/20",
        onViewTrend && "cursor-pointer hover:bg-accent/50"
      )}
      onClick={onViewTrend}
    >
      <Flex align="center" gap="xs" className="mb-1">
        <VitalIcon type={type} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {abnormal && (
          <Tooltip>
            <TooltipTrigger asChild>
              {abnormal === "high" ? (
                <ArrowUp className="h-3 w-3 text-destructive" />
              ) : (
                <ArrowDown className="h-3 w-3 text-blue-500" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {abnormal === "high" ? "Above normal range" : "Below normal range"}
            </TooltipContent>
          </Tooltip>
        )}
      </Flex>

      <Flex align="baseline" gap="xs">
        <span
          className={cn(
            "text-xl font-bold",
            abnormal === "high" && "text-destructive",
            abnormal === "low" && "text-blue-600"
          )}
        >
          {value}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </Flex>

      {!compact && timestamp && (
        <p className="text-xs text-muted-foreground mt-1">{formatDate(timestamp)}</p>
      )}
    </Box>
  );
});

export const VitalSignsPanel = memo(function VitalSignsPanel({
  patientId,
  onAddVitals,
  onViewTrend,
  compact = false,
  className,
}: VitalSignsPanelProps) {
  const { data: vitals, isLoading, error } = useEhrLatestVitals(patientId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Vital Signs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Vital Signs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load vital signs</p>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Check for any abnormal vitals
  const hasAbnormal =
    (vitals?.bloodPressure && (isAbnormal("blood_pressure_systolic", vitals.bloodPressure.systolic) || isAbnormal("blood_pressure_diastolic", vitals.bloodPressure.diastolic))) ||
    (vitals?.heartRate && isAbnormal("heart_rate", vitals.heartRate.value)) ||
    (vitals?.temperature && isAbnormal("temperature", vitals.temperature.value)) ||
    (vitals?.respiratoryRate && isAbnormal("respiratory_rate", vitals.respiratoryRate.value)) ||
    (vitals?.oxygenSaturation && isAbnormal("oxygen_saturation", vitals.oxygenSaturation.value));

  return (
    <Card className={className}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <Activity className={cn("h-5 w-5", hasAbnormal && "text-destructive")} />
            Vital Signs
            {hasAbnormal && <Badge variant="destructive">Abnormal</Badge>}
          </CardTitle>
          {onAddVitals && (
            <Button variant="outline" size="sm" onClick={onAddVitals}>
              <Plus className="h-4 w-4 mr-1" />
              Record
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardContent>
        {!vitals || Object.keys(vitals).length === 0 ? (
          <Box className="text-center text-muted-foreground py-8">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No vital signs recorded</p>
          </Box>
        ) : (
          <Box className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Blood Pressure (combined) */}
            {vitals.bloodPressure && (
              <VitalCard
                label="Blood Pressure"
                value={`${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`}
                unit="mmHg"
                type="blood_pressure"
                timestamp={vitals.bloodPressure.datetime}
                onViewTrend={onViewTrend ? () => onViewTrend("blood_pressure") : undefined}
                compact={compact}
              />
            )}

            {/* Heart Rate */}
            {vitals.heartRate && (
              <VitalCard
                label={VITAL_DISPLAY_NAMES.heart_rate}
                value={vitals.heartRate.value}
                unit={VITAL_UNITS.heart_rate}
                type="heart_rate"
                timestamp={vitals.heartRate.datetime}
                onViewTrend={onViewTrend ? () => onViewTrend("heart_rate") : undefined}
                compact={compact}
              />
            )}

            {/* Temperature */}
            {vitals.temperature && (
              <VitalCard
                label={VITAL_DISPLAY_NAMES.temperature}
                value={vitals.temperature.value.toFixed(1)}
                unit={VITAL_UNITS.temperature}
                type="temperature"
                timestamp={vitals.temperature.datetime}
                onViewTrend={onViewTrend ? () => onViewTrend("temperature") : undefined}
                compact={compact}
              />
            )}

            {/* Respiratory Rate */}
            {vitals.respiratoryRate && (
              <VitalCard
                label={VITAL_DISPLAY_NAMES.respiratory_rate}
                value={vitals.respiratoryRate.value}
                unit={VITAL_UNITS.respiratory_rate}
                type="respiratory_rate"
                timestamp={vitals.respiratoryRate.datetime}
                onViewTrend={onViewTrend ? () => onViewTrend("respiratory_rate") : undefined}
                compact={compact}
              />
            )}

            {/* Oxygen Saturation */}
            {vitals.oxygenSaturation && (
              <VitalCard
                label={VITAL_DISPLAY_NAMES.oxygen_saturation}
                value={vitals.oxygenSaturation.value}
                unit={VITAL_UNITS.oxygen_saturation}
                type="oxygen_saturation"
                timestamp={vitals.oxygenSaturation.datetime}
                onViewTrend={onViewTrend ? () => onViewTrend("oxygen_saturation") : undefined}
                compact={compact}
              />
            )}

            {/* Weight */}
            {vitals.weight && (
              <VitalCard
                label={VITAL_DISPLAY_NAMES.weight}
                value={vitals.weight.value.toFixed(1)}
                unit={VITAL_UNITS.weight}
                type="weight"
                timestamp={vitals.weight.datetime}
                onViewTrend={onViewTrend ? () => onViewTrend("weight") : undefined}
                compact={compact}
              />
            )}

            {/* Height */}
            {vitals.height && (
              <VitalCard
                label={VITAL_DISPLAY_NAMES.height}
                value={vitals.height.value.toFixed(1)}
                unit={VITAL_UNITS.height}
                type="height"
                timestamp={vitals.height.datetime}
                compact={compact}
              />
            )}

            {/* BMI */}
            {vitals.bmi && (
              <VitalCard
                label={VITAL_DISPLAY_NAMES.bmi}
                value={vitals.bmi.value.toFixed(1)}
                unit={VITAL_UNITS.bmi}
                type="bmi"
                timestamp={vitals.bmi.datetime}
                compact={compact}
              />
            )}

            {/* Pain Level */}
            {vitals.pain && (
              <VitalCard
                label={VITAL_DISPLAY_NAMES.pain}
                value={vitals.pain.value}
                unit={VITAL_UNITS.pain}
                type="pain"
                timestamp={vitals.pain.datetime}
                compact={compact}
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

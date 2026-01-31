/**
 * PatientBanner Component
 * Displays patient demographics and critical information in a header banner
 * Similar to VistA CPRS patient selection header
 */

import type { EhrPatient, EhrAllergy } from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Badge,
  Button,
  Flex,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lazarus-life/ui-components";

// Simple Skeleton component
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className || ""}`} />
);
import { cn } from "@lazarus-life/ui-components/utils";
import {
  AlertTriangle,
  Calendar,
  Heart,
  MapPin,
  Phone,
  User,
  FileText,
  Activity,
} from "lucide-react";
import { memo } from "react";
import { MaskedField } from "@/components/security/MaskedField";

interface PatientBannerProps {
  patient: EhrPatient | null;
  allergies?: EhrAllergy[];
  isLoading?: boolean;
  onViewChart?: () => void;
  onViewAllergies?: () => void;
  className?: string;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const PatientBanner = memo(function PatientBanner({
  patient,
  allergies = [],
  isLoading = false,
  onViewChart,
  onViewAllergies,
  className,
}: PatientBannerProps) {
  if (isLoading) {
    return (
      <Box className={cn("bg-card border rounded-lg p-4", className)}>
        <Flex gap="lg" align="center">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Box className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </Box>
        </Flex>
      </Box>
    );
  }

  if (!patient) {
    return (
      <Box className={cn("bg-card border rounded-lg p-4", className)}>
        <Flex align="center" justify="center" className="h-20 text-muted-foreground">
          <User className="h-5 w-5 mr-2" />
          <span>No patient selected</span>
        </Flex>
      </Box>
    );
  }

  const hasAllergies = allergies.length > 0;
  const severeAllergies = allergies.filter((a) => a.severity === "severe" || a.severity === "life_threatening");
  const age = calculateAge(patient.dateOfBirth);

  return (
    <Box
      className={cn(
        "bg-card border rounded-lg overflow-hidden",
        hasAllergies && severeAllergies.length > 0 && "border-destructive",
        className
      )}
    >
      {/* Allergy Alert Bar */}
      {hasAllergies && (
        <Box
          className={cn(
            "px-4 py-2 flex items-center gap-2",
            severeAllergies.length > 0
              ? "bg-destructive text-destructive-foreground"
              : "bg-warning text-warning-foreground"
          )}
          role="alert"
        >
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium text-sm">
            {severeAllergies.length > 0
              ? `${severeAllergies.length} SEVERE ALLERG${severeAllergies.length === 1 ? "Y" : "IES"}`
              : `${allergies.length} Allerg${allergies.length === 1 ? "y" : "ies"}`}
          </span>
          {onViewAllergies && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAllergies}
              className="ml-auto h-6 text-xs"
            >
              View All
            </Button>
          )}
        </Box>
      )}

      {/* Main Banner Content */}
      <Flex gap="lg" className="p-4">
        {/* Patient Avatar/Initial */}
        <Box
          className={cn(
            "h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0",
            patient.gender === "male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
          )}
        >
          {patient.firstName[0]}
          {patient.lastName[0]}
        </Box>

        {/* Patient Info */}
        <Box className="flex-1 min-w-0">
          {/* Name and Demographics */}
          <Flex align="center" gap="sm" className="mb-1">
            <h2 className="text-xl font-bold truncate">
              {patient.lastName}, {patient.firstName}
              {patient.middleName && ` ${patient.middleName[0]}.`}
            </h2>
            <Badge variant={patient.gender === "male" ? "default" : "secondary"}>
              {patient.gender === "male" ? "Male" : patient.gender === "female" ? "Female" : patient.gender}
            </Badge>
            <Badge variant="outline">{age} yo</Badge>
          </Flex>

          {/* DOB and MRN */}
          <Flex gap="lg" className="text-sm text-muted-foreground mb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Flex align="center" gap="xs">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>DOB: {formatDate(patient.dateOfBirth)}</span>
                </Flex>
              </TooltipTrigger>
              <TooltipContent>Date of Birth</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Flex align="center" gap="xs">
                  <FileText className="h-3.5 w-3.5" />
                  <span>MRN: {patient.mrn}</span>
                </Flex>
              </TooltipTrigger>
              <TooltipContent>Medical Record Number</TooltipContent>
            </Tooltip>

            {patient.ssnLastFour && (
              <MaskedField
                value={`***-**-${patient.ssnLastFour}`}
                field="ssn"
                label="SSN"
                showRevealButton={true}
                className="text-sm"
              />
            )}
          </Flex>

          {/* Contact Info */}
          <Flex gap="lg" className="text-sm text-muted-foreground">
            {patient.phoneHome && (
              <Flex align="center" gap="xs">
                <Phone className="h-3.5 w-3.5" />
                <MaskedField value={patient.phoneHome} field="phone" showRevealButton={false} />
              </Flex>
            )}
            {patient.city && patient.state && (
              <Flex align="center" gap="xs">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {patient.city}, {patient.state}
                </span>
              </Flex>
            )}
          </Flex>
        </Box>

        {/* Quick Actions */}
        <Flex direction="column" gap="sm" className="shrink-0">
          {onViewChart && (
            <Button variant="outline" size="sm" onClick={onViewChart}>
              <Activity className="h-4 w-4 mr-2" />
              View Chart
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Heart className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
});

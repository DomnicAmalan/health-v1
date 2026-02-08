/**
 * Patient Duplicate Check Dialog
 * Dialog for checking and handling potential duplicate patients before creation
 * RFC 0002: Patient Module Improvements
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Button,
  Badge,
  Skeleton,
} from "@lazarus-life/ui-components";
import {
  useFindDuplicatePatients,
  type FindDuplicatesRequest,
  type PotentialDuplicate,
} from "@/hooks/api/ehr/useEhrPatients";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, User, Calendar, ArrowRight } from "lucide-react";
import type { EhrPatient } from "@lazarus-life/shared/types/ehr";

interface PatientDuplicateCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Patient data to check for duplicates */
  patientData: FindDuplicatesRequest;
  /** Called when user confirms this is a new patient (no duplicates) */
  onConfirmNew: () => void;
  /** Called when user selects an existing patient as the match */
  onSelectExisting: (patient: EhrPatient) => void;
  /** Called when user wants to merge with an existing patient */
  onMergeRequest?: (duplicate: PotentialDuplicate) => void;
}

/**
 * Format patient name for display
 */
function formatPatientName(patient: EhrPatient): string {
  const parts = [patient.firstName, patient.middleName, patient.lastName].filter(Boolean);
  return parts.join(" ") || "Unknown";
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: string | undefined): string {
  if (!dob) return "Unknown";
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age}y`;
}

/**
 * Get match level based on score
 */
function getMatchLevel(score: number): { label: string; variant: "destructive" | "secondary" | "outline" } {
  if (score >= 80) return { label: "High", variant: "destructive" };
  if (score >= 50) return { label: "Medium", variant: "secondary" };
  return { label: "Low", variant: "outline" };
}

/**
 * Duplicate patient card
 */
function DuplicateCard({
  duplicate,
  onSelect,
  onMerge,
}: {
  duplicate: PotentialDuplicate;
  onSelect: () => void;
  onMerge?: () => void;
}) {
  const matchLevel = getMatchLevel(duplicate.matchScore);

  return (
    <div className="rounded-lg border p-4 space-y-3 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{formatPatientName(duplicate.patient)}</span>
        </div>
        <Badge variant={matchLevel.variant}>
          {matchLevel.label} Match ({duplicate.matchScore}%)
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        {duplicate.patient.mrn && (
          <div>
            MRN: <span className="font-mono">{duplicate.patient.mrn}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {duplicate.patient.dateOfBirth
            ? `${new Date(duplicate.patient.dateOfBirth).toLocaleDateString()} (${calculateAge(duplicate.patient.dateOfBirth)})`
            : "DOB Unknown"}
        </div>
        {duplicate.patient.gender && (
          <div className="capitalize">Gender: {duplicate.patient.gender}</div>
        )}
        {duplicate.patient.phoneMobile && <div>Phone: {duplicate.patient.phoneMobile}</div>}
      </div>

      <div className="text-xs text-muted-foreground">
        Match reasons: {duplicate.matchReasons.join(", ")}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onSelect} className="flex-1">
          Use This Patient
        </Button>
        {onMerge && (
          <Button variant="ghost" size="sm" onClick={onMerge}>
            Merge
          </Button>
        )}
      </div>
    </div>
  );
}

export function PatientDuplicateCheckDialog({
  open,
  onOpenChange,
  patientData,
  onConfirmNew,
  onSelectExisting,
  onMergeRequest,
}: PatientDuplicateCheckDialogProps) {
  const [duplicates, setDuplicates] = useState<PotentialDuplicate[]>([]);
  const findDuplicates = useFindDuplicatePatients();

  // Check for duplicates when dialog opens
  useEffect(() => {
    if (open && patientData.firstName && patientData.lastName && patientData.dateOfBirth) {
      findDuplicates.mutate(patientData, {
        onSuccess: (data) => {
          setDuplicates(data);
        },
      });
    }
  }, [open, patientData.firstName, patientData.lastName, patientData.dateOfBirth]);

  const handleClose = () => {
    setDuplicates([]);
    onOpenChange(false);
  };

  const handleConfirmNew = () => {
    onConfirmNew();
    handleClose();
  };

  const handleSelectExisting = (patient: EhrPatient) => {
    onSelectExisting(patient);
    handleClose();
  };

  const handleMergeRequest = (duplicate: PotentialDuplicate) => {
    onMergeRequest?.(duplicate);
    handleClose();
  };

  const isLoading = findDuplicates.isPending;
  const hasHighMatchDuplicates = duplicates.some((d) => d.matchScore >= 80);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoading ? (
              "Checking for Duplicates..."
            ) : duplicates.length > 0 ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Potential Duplicate Patients Found
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                No Duplicates Found
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? "Searching for existing patients with similar information..."
              : duplicates.length > 0
                ? `Found ${duplicates.length} potential duplicate(s) for ${patientData.firstName} ${patientData.lastName}. Please review before continuing.`
                : "No matching patients found. You can proceed with creating a new patient record."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* New Patient Info */}
          <div className="rounded-lg border-2 border-dashed border-primary/50 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <ArrowRight className="h-4 w-4" />
              New Patient Information
            </div>
            <div className="flex items-center gap-4">
              <User className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {patientData.firstName} {patientData.lastName}
                </div>
                <div className="text-sm text-muted-foreground">
                  DOB: {new Date(patientData.dateOfBirth).toLocaleDateString()}
                  {patientData.ssnLastFour && ` | SSN: ***-**-${patientData.ssnLastFour}`}
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {/* Duplicate List */}
          {!isLoading && duplicates.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Potential Matches:</div>
              {duplicates.map((duplicate) => (
                <DuplicateCard
                  key={duplicate.patientId}
                  duplicate={duplicate}
                  onSelect={() => handleSelectExisting(duplicate.patient)}
                  onMerge={onMergeRequest ? () => handleMergeRequest(duplicate) : undefined}
                />
              ))}
            </div>
          )}

          {/* Warning for high matches */}
          {!isLoading && hasHighMatchDuplicates && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-700 dark:text-amber-400">
              <strong>Warning:</strong> One or more matches have a high confidence score. Please
              carefully verify this is not a duplicate before creating a new record.
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {!isLoading && (
            <Button
              type="button"
              variant={hasHighMatchDuplicates ? "destructive" : "default"}
              onClick={handleConfirmNew}
            >
              {hasHighMatchDuplicates
                ? "Create New Anyway"
                : duplicates.length > 0
                  ? "Create New Patient"
                  : "Continue"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

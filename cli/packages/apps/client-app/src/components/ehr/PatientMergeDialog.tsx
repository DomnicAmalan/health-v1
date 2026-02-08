/**
 * Patient Merge Dialog
 * Dialog for merging duplicate patient records
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
  Label,
  Textarea,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
} from "@lazarus-life/ui-components";
import { useState } from "react";
import { useMergePatients, type PotentialDuplicate } from "@/hooks/api/ehr/useEhrPatients";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, User, Calendar, Mail, Phone } from "lucide-react";
import type { EhrPatient } from "@lazarus-life/shared/types/ehr";

interface PatientMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The patient that will be kept (survivor) */
  survivorPatient: EhrPatient;
  /** The patient that will be merged (duplicate) */
  duplicatePatient: EhrPatient;
  /** Optional match information from duplicate detection */
  matchInfo?: PotentialDuplicate;
  onSuccess?: (mergedPatient: EhrPatient) => void;
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
  return `${age} years`;
}

/**
 * Patient info card for comparison
 */
function PatientCard({
  patient,
  label,
  variant = "default",
}: {
  patient: EhrPatient;
  label: string;
  variant?: "survivor" | "duplicate" | "default";
}) {
  const borderColor =
    variant === "survivor"
      ? "border-green-500"
      : variant === "duplicate"
        ? "border-red-500"
        : "border-border";

  return (
    <div className={`rounded-lg border-2 ${borderColor} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {variant === "survivor" && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Keep
          </Badge>
        )}
        {variant === "duplicate" && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Merge
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{formatPatientName(patient)}</span>
        </div>

        {patient.mrn && (
          <div className="text-sm text-muted-foreground">
            MRN: <span className="font-mono">{patient.mrn}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {patient.dateOfBirth
              ? `${new Date(patient.dateOfBirth).toLocaleDateString()} (${calculateAge(patient.dateOfBirth)})`
              : "DOB Unknown"}
          </span>
        </div>

        {patient.gender && (
          <div className="text-sm text-muted-foreground capitalize">
            Gender: {patient.gender}
          </div>
        )}

        {patient.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{patient.email}</span>
          </div>
        )}

        {(patient.phoneHome || patient.phoneMobile) && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{patient.phoneMobile || patient.phoneHome}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PatientMergeDialog({
  open,
  onOpenChange,
  survivorPatient,
  duplicatePatient,
  matchInfo,
  onSuccess,
}: PatientMergeDialogProps) {
  const [mergeReason, setMergeReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const mergePatients = useMergePatients();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmed) {
      toast.error("Please confirm that you want to merge these patients");
      return;
    }

    try {
      const result = await mergePatients.mutateAsync({
        survivorId: survivorPatient.id,
        duplicateId: duplicatePatient.id,
        mergeReason: mergeReason.trim() || undefined,
      });

      toast.success("Patients merged successfully");

      // Reset form
      setMergeReason("");
      setConfirmed(false);

      onSuccess?.(result);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to merge patients");
      console.error("Error merging patients:", error);
    }
  };

  const handleClose = () => {
    setMergeReason("");
    setConfirmed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Merge Patient Records
          </DialogTitle>
          <DialogDescription>
            This action will merge all clinical data from the duplicate record into the survivor
            record. The duplicate record will be marked as merged and deactivated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Match Score */}
          {matchInfo && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Match Score:</span>
              <Badge
                variant={matchInfo.matchScore >= 80 ? "destructive" : "secondary"}
              >
                {matchInfo.matchScore}%
              </Badge>
              <span className="text-muted-foreground">
                ({matchInfo.matchReasons.join(", ")})
              </span>
            </div>
          )}

          {/* Patient Comparison */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
            <PatientCard
              patient={duplicatePatient}
              label="Duplicate (Will Be Merged)"
              variant="duplicate"
            />

            <ArrowRight className="h-6 w-6 text-muted-foreground" />

            <PatientCard
              patient={survivorPatient}
              label="Survivor (Will Be Kept)"
              variant="survivor"
            />
          </div>

          {/* Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning: This action cannot be undone</AlertTitle>
            <AlertDescription>
              The following data will be moved to the survivor record:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All encounters and visits</li>
                <li>All appointments</li>
                <li>All lab orders and results</li>
                <li>All medications and prescriptions</li>
                <li>All clinical notes and documents</li>
                <li>All problem list entries</li>
                <li>All allergy records</li>
                <li>All vital signs</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Merge Reason */}
          <div className="space-y-2">
            <Label htmlFor="merge-reason">Merge Reason</Label>
            <Textarea
              id="merge-reason"
              value={mergeReason}
              onChange={(e) => setMergeReason(e.target.value)}
              placeholder="Describe why these records are being merged (optional but recommended)..."
              rows={3}
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="confirm-merge"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="confirm-merge" className="text-sm cursor-pointer">
              I confirm that I have verified these are duplicate records for the same patient and
              understand that this action cannot be undone.
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={mergePatients.isPending || !confirmed}
            >
              {mergePatients.isPending ? "Merging..." : "Merge Patients"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

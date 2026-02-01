/**
 * Add Problem Dialog
 * Dialog for adding a new problem to patient's problem list
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
} from "@lazarus-life/ui-components";
import { useState } from "react";
import { useCreateEhrProblem } from "@/hooks/api/ehr/useEhrProblems";
import { toast } from "sonner";

interface AddProblemDialogProps {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddProblemDialog({
  patientId,
  open,
  onOpenChange,
  onSuccess,
}: AddProblemDialogProps) {
  const [diagnosis, setDiagnosis] = useState("");
  const [icdCode, setIcdCode] = useState("");
  const [snomedCode, setSnomedCode] = useState("");
  const [onsetDate, setOnsetDate] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [notes, setNotes] = useState("");

  const createProblem = useCreateEhrProblem();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!diagnosis.trim()) {
      toast.error("Diagnosis is required");
      return;
    }

    try {
      await createProblem.mutateAsync({
        patientId,
        diagnosis: diagnosis.trim(),
        icdCode: icdCode.trim() || undefined,
        snomedCode: snomedCode.trim() || undefined,
        onsetDate: onsetDate || undefined,
        status,
        notes: notes.trim() || undefined,
      });

      toast.success("Problem added successfully");

      // Reset form
      setDiagnosis("");
      setIcdCode("");
      setSnomedCode("");
      setOnsetDate("");
      setStatus("ACTIVE");
      setNotes("");

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to add problem");
      console.error("Error adding problem:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Problem</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Diagnosis */}
          <div className="space-y-2">
            <Label htmlFor="diagnosis">
              Diagnosis <span className="text-destructive">*</span>
            </Label>
            <Input
              id="diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g., Hypertension, Type 2 Diabetes"
              required
            />
          </div>

          {/* ICD-10 Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icd-code">ICD-10 Code</Label>
              <Input
                id="icd-code"
                value={icdCode}
                onChange={(e) => setIcdCode(e.target.value)}
                placeholder="e.g., I10, E11.9"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                International Classification of Diseases code
              </p>
            </div>

            {/* SNOMED CT Code */}
            <div className="space-y-2">
              <Label htmlFor="snomed-code">SNOMED CT Code</Label>
              <Input
                id="snomed-code"
                value={snomedCode}
                onChange={(e) => setSnomedCode(e.target.value)}
                placeholder="e.g., 38341003"
              />
              <p className="text-xs text-muted-foreground">
                Systematized Nomenclature of Medicine code
              </p>
            </div>
          </div>

          {/* Onset Date & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="onset-date">Onset Date</Label>
              <Input
                id="onset-date"
                type="date"
                value={onsetDate}
                onChange={(e) => setOnsetDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as typeof status)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Clinical Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional clinical notes about this problem..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProblem.isPending}>
              {createProblem.isPending ? "Adding..." : "Add Problem"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

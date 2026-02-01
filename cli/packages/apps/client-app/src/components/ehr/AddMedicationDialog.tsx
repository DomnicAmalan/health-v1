/**
 * Add Medication Dialog
 * Dialog for adding a new medication to patient's medication list
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
import { useCreateEhrMedication } from "@/hooks/api/ehr/useEhrMedications";
import { toast } from "sonner";

interface AddMedicationDialogProps {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddMedicationDialog({
  patientId,
  open,
  onOpenChange,
  onSuccess,
}: AddMedicationDialogProps) {
  const [drugName, setDrugName] = useState("");
  const [drugCode, setDrugCode] = useState("");
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState("PO");
  const [frequency, setFrequency] = useState("DAILY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prescriberIen, setPrescriberIen] = useState("");
  const [instructions, setInstructions] = useState("");

  const createMedication = useCreateEhrMedication();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!drugName.trim() || !dose.trim()) {
      toast.error("Drug name and dose are required");
      return;
    }

    try {
      await createMedication.mutateAsync({
        patientId,
        drugName: drugName.trim(),
        drugCode: drugCode.trim() || undefined,
        dose: dose.trim(),
        route,
        frequency,
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || undefined,
        prescriberIen: prescriberIen || undefined,
        status: "ACTIVE",
        instructions: instructions.trim() || undefined,
      });

      toast.success("Medication added successfully");

      // Reset form
      setDrugName("");
      setDrugCode("");
      setDose("");
      setRoute("PO");
      setFrequency("DAILY");
      setStartDate("");
      setEndDate("");
      setPrescriberIen("");
      setInstructions("");

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to add medication");
      console.error("Error adding medication:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Medication</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drug Name */}
          <div className="space-y-2">
            <Label htmlFor="drug-name">
              Drug Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="drug-name"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              placeholder="e.g., Metformin 1000mg TAB, Lisinopril 20mg TAB"
              required
            />
          </div>

          {/* Drug Code & Dose */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drug-code">Drug Code</Label>
              <Input
                id="drug-code"
                value={drugCode}
                onChange={(e) => setDrugCode(e.target.value)}
                placeholder="NDC or internal code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dose">
                Dose <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dose"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="e.g., 1000mg, 20mg, 2 puffs"
                required
              />
            </div>
          </div>

          {/* Route & Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="route">Route</Label>
              <Select value={route} onValueChange={setRoute}>
                <SelectTrigger id="route">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PO">PO (By mouth)</SelectItem>
                  <SelectItem value="IV">IV (Intravenous)</SelectItem>
                  <SelectItem value="IM">IM (Intramuscular)</SelectItem>
                  <SelectItem value="SC">SC (Subcutaneous)</SelectItem>
                  <SelectItem value="INH">INH (Inhalation)</SelectItem>
                  <SelectItem value="TOP">TOP (Topical)</SelectItem>
                  <SelectItem value="SL">SL (Sublingual)</SelectItem>
                  <SelectItem value="PR">PR (Rectal)</SelectItem>
                  <SelectItem value="OPTH">OPTH (Ophthalmic)</SelectItem>
                  <SelectItem value="OTIC">OTIC (Otic)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">DAILY (Once daily)</SelectItem>
                  <SelectItem value="BID">BID (Twice daily)</SelectItem>
                  <SelectItem value="TID">TID (Three times daily)</SelectItem>
                  <SelectItem value="QID">QID (Four times daily)</SelectItem>
                  <SelectItem value="QHS">QHS (At bedtime)</SelectItem>
                  <SelectItem value="Q4H">Q4H (Every 4 hours)</SelectItem>
                  <SelectItem value="Q6H">Q6H (Every 6 hours)</SelectItem>
                  <SelectItem value="Q8H">Q8H (Every 8 hours)</SelectItem>
                  <SelectItem value="Q12H">Q12H (Every 12 hours)</SelectItem>
                  <SelectItem value="PRN">PRN (As needed)</SelectItem>
                  <SelectItem value="WEEKLY">WEEKLY (Once weekly)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-muted-foreground">
                Defaults to today if not specified
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date (Optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Prescriber */}
          <div className="space-y-2">
            <Label htmlFor="prescriber">Prescriber IEN</Label>
            <Input
              id="prescriber"
              value={prescriberIen}
              onChange={(e) => setPrescriberIen(e.target.value)}
              placeholder="Provider internal entry number"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Patient Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Take with food, Avoid alcohol, Take in the morning"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMedication.isPending}>
              {createMedication.isPending ? "Adding..." : "Add Medication"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

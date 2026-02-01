/**
 * Add Allergy Dialog
 * Dialog for adding a new allergy to patient's allergy list
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
import { useCreateEhrAllergy } from "@/hooks/api/ehr/useEhrAllergies";
import { toast } from "sonner";

interface AddAllergyDialogProps {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type AllergyType = "DRUG" | "FOOD" | "ENVIRONMENTAL" | "OTHER";
type SeverityType = "MILD" | "MODERATE" | "SEVERE" | "LIFE_THREATENING";

export function AddAllergyDialog({
  patientId,
  open,
  onOpenChange,
  onSuccess,
}: AddAllergyDialogProps) {
  const [allergen, setAllergen] = useState("");
  const [allergyType, setAllergyType] = useState<AllergyType>("DRUG");
  const [severity, setSeverity] = useState<SeverityType>("MODERATE");
  const [reactions, setReactions] = useState("");
  const [notes, setNotes] = useState("");

  const createAllergy = useCreateEhrAllergy();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allergen.trim()) {
      toast.error("Allergen is required");
      return;
    }

    if (!reactions.trim()) {
      toast.error("Reactions are required");
      return;
    }

    try {
      await createAllergy.mutateAsync({
        patientId,
        allergen: allergen.trim(),
        allergyType,
        severity,
        reactions: reactions.trim(),
        status: "ACTIVE",
        notes: notes.trim() || undefined,
      });

      toast.success("Allergy added successfully");

      // Reset form
      setAllergen("");
      setAllergyType("DRUG");
      setSeverity("MODERATE");
      setReactions("");
      setNotes("");

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to add allergy");
      console.error("Error adding allergy:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Allergy</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Allergen */}
          <div className="space-y-2">
            <Label htmlFor="allergen">
              Allergen <span className="text-destructive">*</span>
            </Label>
            <Input
              id="allergen"
              value={allergen}
              onChange={(e) => setAllergen(e.target.value)}
              placeholder="e.g., Penicillin, Peanuts, Latex, Pollen"
              required
            />
          </div>

          {/* Allergy Type & Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="allergy-type">Allergy Type</Label>
              <Select value={allergyType} onValueChange={(val) => setAllergyType(val as AllergyType)}>
                <SelectTrigger id="allergy-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRUG">Drug</SelectItem>
                  <SelectItem value="FOOD">Food</SelectItem>
                  <SelectItem value="ENVIRONMENTAL">Environmental</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select value={severity} onValueChange={(val) => setSeverity(val as SeverityType)}>
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILD">Mild</SelectItem>
                  <SelectItem value="MODERATE">Moderate</SelectItem>
                  <SelectItem value="SEVERE">Severe</SelectItem>
                  <SelectItem value="LIFE_THREATENING">Life-Threatening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reactions */}
          <div className="space-y-2">
            <Label htmlFor="reactions">
              Reactions <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reactions"
              value={reactions}
              onChange={(e) => setReactions(e.target.value)}
              placeholder="e.g., Rash, Hives, Anaphylaxis, Difficulty Breathing"
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              Describe the reaction(s) that occur when exposed to this allergen
            </p>
          </div>

          {/* Severity Guidance */}
          <div className="p-4 bg-muted rounded-md space-y-2 text-sm">
            <div className="font-medium">Severity Guidelines:</div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>Mild:</strong> Minor symptoms (itching, mild rash)
              </li>
              <li>
                <strong>Moderate:</strong> More significant symptoms (hives, moderate rash, nausea)
              </li>
              <li>
                <strong>Severe:</strong> Serious symptoms (swelling, difficulty breathing, vomiting)
              </li>
              <li>
                <strong>Life-Threatening:</strong> Anaphylaxis, severe respiratory distress, shock
              </li>
            </ul>
          </div>

          {/* Clinical Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Clinical Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this allergy..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAllergy.isPending}>
              {createAllergy.isPending ? "Adding..." : "Add Allergy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

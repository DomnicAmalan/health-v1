/**
 * Order Lab Dialog
 * Dialog for ordering laboratory tests
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Checkbox,
} from "@lazarus-life/ui-components";
import { useState } from "react";
import { useCreateEhrOrder } from "@/hooks/api/ehr/useEhrOrders";
import { toast } from "sonner";

interface OrderLabDialogProps {
  patientId: string;
  visitId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Common lab test panels
const LAB_PANELS = {
  CBC: {
    name: "Complete Blood Count (CBC)",
    tests: ["WBC", "RBC", "Hemoglobin", "Hematocrit", "Platelet Count", "Differential"],
  },
  CMP: {
    name: "Comprehensive Metabolic Panel (CMP)",
    tests: [
      "Glucose",
      "Calcium",
      "Sodium",
      "Potassium",
      "CO2",
      "Chloride",
      "BUN",
      "Creatinine",
      "Albumin",
      "Total Protein",
      "ALP",
      "ALT",
      "AST",
      "Bilirubin",
    ],
  },
  BMP: {
    name: "Basic Metabolic Panel (BMP)",
    tests: ["Glucose", "Calcium", "Sodium", "Potassium", "CO2", "Chloride", "BUN", "Creatinine"],
  },
  LIPID: {
    name: "Lipid Panel",
    tests: ["Total Cholesterol", "HDL", "LDL", "Triglycerides", "VLDL"],
  },
  LFT: {
    name: "Liver Function Tests (LFT)",
    tests: ["ALT", "AST", "ALP", "Bilirubin Total", "Bilirubin Direct", "Albumin", "Total Protein"],
  },
  TSH: {
    name: "Thyroid Panel",
    tests: ["TSH", "Free T4", "Free T3"],
  },
  HBA1C: {
    name: "Hemoglobin A1c",
    tests: ["HbA1c"],
  },
  COAG: {
    name: "Coagulation Panel",
    tests: ["PT", "INR", "PTT"],
  },
  UA: {
    name: "Urinalysis",
    tests: ["Color", "Clarity", "Specific Gravity", "pH", "Protein", "Glucose", "Ketones", "Blood", "Leukocytes", "Nitrites"],
  },
  CUSTOM: {
    name: "Custom Lab Order",
    tests: [],
  },
};

export function OrderLabDialog({
  patientId,
  visitId,
  open,
  onOpenChange,
  onSuccess,
}: OrderLabDialogProps) {
  const [selectedPanel, setSelectedPanel] = useState<keyof typeof LAB_PANELS>("CBC");
  const [priority, setPriority] = useState<"ROUTINE" | "STAT" | "URGENT">("ROUTINE");
  const [fasting, setFasting] = useState(false);
  const [customTests, setCustomTests] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  const createOrder = useCreateEhrOrder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const panel = LAB_PANELS[selectedPanel];
    const tests = selectedPanel === "CUSTOM" ? customTests : panel.tests.join(", ");

    if (!tests) {
      toast.error("Please specify lab tests to order");
      return;
    }

    try {
      await createOrder.mutateAsync({
        patientId,
        visitId,
        orderType: "LAB",
        orderText: `${panel.name}${tests ? `: ${tests}` : ""}`,
        priority,
        status: "UNSIGNED",
        notes: clinicalNotes.trim() || undefined,
        metadata: {
          panel: selectedPanel,
          fasting,
        },
      });

      toast.success("Lab order created successfully");

      // Reset form
      setSelectedPanel("CBC");
      setPriority("ROUTINE");
      setFasting(false);
      setCustomTests("");
      setClinicalNotes("");

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create lab order");
      console.error("Error creating order:", error);
    }
  };

  const currentPanel = LAB_PANELS[selectedPanel];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Laboratory Tests</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lab Panel Selection */}
          <div className="space-y-2">
            <Label htmlFor="panel">Lab Panel / Test</Label>
            <Select
              value={selectedPanel}
              onValueChange={(val) => setSelectedPanel(val as keyof typeof LAB_PANELS)}
            >
              <SelectTrigger id="panel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LAB_PANELS).map(([key, panel]) => (
                  <SelectItem key={key} value={key}>
                    {panel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Panel Tests Display */}
          {selectedPanel !== "CUSTOM" && currentPanel.tests.length > 0 && (
            <div className="p-4 bg-muted rounded-md">
              <div className="text-sm font-medium mb-2">Tests Included:</div>
              <div className="flex flex-wrap gap-2">
                {currentPanel.tests.map((test) => (
                  <span
                    key={test}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {test}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Custom Tests Input */}
          {selectedPanel === "CUSTOM" && (
            <div className="space-y-2">
              <Label htmlFor="custom-tests">
                Specify Tests <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="custom-tests"
                value={customTests}
                onChange={(e) => setCustomTests(e.target.value)}
                placeholder="Enter lab tests separated by commas..."
                rows={3}
                required
              />
            </div>
          )}

          {/* Priority & Fasting */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val as typeof priority)}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="STAT">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Specimen Requirements</Label>
              <div className="flex items-center space-x-2 h-10 px-3 border rounded-md">
                <Checkbox
                  id="fasting"
                  checked={fasting}
                  onCheckedChange={(checked) => setFasting(checked as boolean)}
                />
                <label
                  htmlFor="fasting"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Fasting Required
                </label>
              </div>
            </div>
          </div>

          {/* Clinical Notes / Indication */}
          <div className="space-y-2">
            <Label htmlFor="clinical-notes">Clinical Indication</Label>
            <Textarea
              id="clinical-notes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Clinical reason for ordering these tests (e.g., Annual physical, Follow-up diabetes, Rule out anemia)"
              rows={3}
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md space-y-2 text-sm">
            <div className="font-medium text-blue-900 dark:text-blue-100">Order Information</div>
            <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
              <li>
                <strong>ROUTINE:</strong> Results within 24-48 hours
              </li>
              <li>
                <strong>URGENT:</strong> Results within 4-6 hours
              </li>
              <li>
                <strong>STAT:</strong> Results within 1 hour (for critical situations)
              </li>
            </ul>
            {fasting && (
              <p className="mt-2 text-orange-800 dark:text-orange-200 font-medium">
                ⚠️ Patient must fast 8-12 hours before specimen collection
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createOrder.isPending}>
              {createOrder.isPending ? "Ordering..." : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

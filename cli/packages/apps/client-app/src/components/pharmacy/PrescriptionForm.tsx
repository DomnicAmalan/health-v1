/**
 * PrescriptionForm Component
 * Form for creating new prescriptions with interaction checking
 */

import type {
  Drug,
  CreatePrescriptionRequest,
  DrugRoute,
} from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import { memo, useState, useCallback, useEffect } from "react";
import {
  useCreatePrescription,
  useCheckPatientDrugInteractions,
} from "@/hooks/api/pharmacy";
import { useEmitWorkflowEvent } from "@/hooks/api/workflows/useWorkflows";
import { DrugSearchSelect } from "./DrugSearchSelect";
import { InteractionAlert } from "./InteractionAlert";

interface PrescriptionFormProps {
  patientIen: number;
  prescriberIen?: number;
  onSuccess?: (ien: number) => void;
  onCancel?: () => void;
  className?: string;
}

const FREQUENCY_OPTIONS = [
  { value: "QD", label: "Once daily (QD)" },
  { value: "BID", label: "Twice daily (BID)" },
  { value: "TID", label: "Three times daily (TID)" },
  { value: "QID", label: "Four times daily (QID)" },
  { value: "Q4H", label: "Every 4 hours (Q4H)" },
  { value: "Q6H", label: "Every 6 hours (Q6H)" },
  { value: "Q8H", label: "Every 8 hours (Q8H)" },
  { value: "Q12H", label: "Every 12 hours (Q12H)" },
  { value: "QHS", label: "At bedtime (QHS)" },
  { value: "PRN", label: "As needed (PRN)" },
  { value: "STAT", label: "Immediately (STAT)" },
  { value: "WEEKLY", label: "Once weekly" },
];

const ROUTE_OPTIONS: { value: DrugRoute; label: string }[] = [
  { value: "oral", label: "Oral (PO)" },
  { value: "sublingual", label: "Sublingual (SL)" },
  { value: "intravenous", label: "Intravenous (IV)" },
  { value: "intramuscular", label: "Intramuscular (IM)" },
  { value: "subcutaneous", label: "Subcutaneous (SC)" },
  { value: "topical", label: "Topical" },
  { value: "transdermal", label: "Transdermal" },
  { value: "inhalation", label: "Inhalation" },
  { value: "nasal", label: "Nasal" },
  { value: "ophthalmic", label: "Ophthalmic" },
  { value: "otic", label: "Otic (Ear)" },
  { value: "rectal", label: "Rectal (PR)" },
  { value: "vaginal", label: "Vaginal" },
];

const DAYS_SUPPLY_OPTIONS = [7, 14, 30, 60, 90];

export const PrescriptionForm = memo(function PrescriptionForm({
  patientIen,
  prescriberIen,
  onSuccess,
  onCancel,
  className,
}: PrescriptionFormProps) {
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState<DrugRoute>("oral");
  const [frequency, setFrequency] = useState("QD");
  const [quantity, setQuantity] = useState(30);
  const [daysSupply, setDaysSupply] = useState(30);
  const [refillsAllowed, setRefillsAllowed] = useState(0);
  const [sig, setSig] = useState("");
  const [showInteractionWarning, setShowInteractionWarning] = useState(false);

  const createMutation = useCreatePrescription();
  const emitEvent = useEmitWorkflowEvent();

  // Check interactions when drug is selected
  const drugIds = selectedDrug ? [selectedDrug.id] : [];
  const { data: interactions, isLoading: checkingInteractions } =
    useCheckPatientDrugInteractions(String(patientIen), drugIds);

  // Auto-populate route from drug
  useEffect(() => {
    if (selectedDrug?.route) {
      setRoute(selectedDrug.route);
    }
  }, [selectedDrug]);

  // Auto-generate SIG
  useEffect(() => {
    if (selectedDrug && dose && frequency) {
      const routeLabel = ROUTE_OPTIONS.find((r) => r.value === route)?.label || route;
      const freqLabel = FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label || frequency;
      setSig(`Take ${dose} ${routeLabel} ${freqLabel}`);
    }
  }, [selectedDrug, dose, route, frequency]);

  // Check for controlled substance refill limits
  useEffect(() => {
    if (selectedDrug?.schedule?.maxRefills !== undefined) {
      setRefillsAllowed(Math.min(refillsAllowed, selectedDrug.schedule.maxRefills));
    }
  }, [selectedDrug, refillsAllowed]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedDrug) return;

      // Show warning if there are critical interactions
      if (interactions?.hasCritical && !showInteractionWarning) {
        setShowInteractionWarning(true);
        return;
      }

      const request: CreatePrescriptionRequest = {
        patientIen,
        drugName: selectedDrug.genericName,
        drugCode: selectedDrug.drugCode,
        dose,
        route,
        frequency,
        sig,
        quantity,
        daysSupply,
        refillsAllowed,
        prescriberIen,
      };

      try {
        const result = await createMutation.mutateAsync(request);

        // Emit workflow event for automation (n8n-style)
        emitEvent.mutate({
          eventType: "prescription_created",
          payload: {
            prescriptionId: result.ien.toString(),
            patientId: patientIen.toString(),
            drugId: selectedDrug.ien,
            drugName: selectedDrug.name,
            prescriberId: prescriberIen?.toString(),
            createdAt: new Date().toISOString(),
          },
        });

        onSuccess?.(result.ien);
      } catch (error) {
        console.error("Failed to create prescription:", error);
      }
    },
    [
      selectedDrug,
      interactions,
      showInteractionWarning,
      patientIen,
      dose,
      route,
      frequency,
      sig,
      quantity,
      daysSupply,
      refillsAllowed,
      prescriberIen,
      createMutation,
      onSuccess,
    ]
  );

  const isValid =
    selectedDrug && dose && route && frequency && quantity > 0 && daysSupply > 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Prescription
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </Flex>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drug Selection */}
          <Box>
            <Label htmlFor="drug-search">Medication</Label>
            <DrugSearchSelect
              value={selectedDrug}
              onSelect={setSelectedDrug}
              placeholder="Search for a medication..."
              className="mt-1.5"
            />
          </Box>

          {/* Interaction Alert */}
          {selectedDrug && (
            <InteractionAlert
              interactions={interactions}
              isLoading={checkingInteractions}
              compact
            />
          )}

          {/* Critical Interaction Warning */}
          {showInteractionWarning && interactions?.hasCritical && (
            <Box className="p-4 border border-destructive rounded-lg bg-destructive/10">
              <Flex align="start" gap="sm">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <Box>
                  <p className="font-medium text-destructive">
                    Critical interactions detected!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Are you sure you want to proceed with this prescription?
                    Please review the interactions above.
                  </p>
                  <Flex gap="sm" className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInteractionWarning(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      size="sm"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Proceed Anyway
                    </Button>
                  </Flex>
                </Box>
              </Flex>
            </Box>
          )}

          {/* Dosage Fields */}
          <Box className="grid grid-cols-2 gap-4">
            <Box>
              <Label htmlFor="dose">Dose</Label>
              <Input
                id="dose"
                value={dose}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDose(e.target.value)}
                placeholder={selectedDrug?.usualDose || "e.g., 500mg"}
                className="mt-1.5"
              />
              {selectedDrug?.usualDose && (
                <p className="text-xs text-muted-foreground mt-1">
                  Usual dose: {selectedDrug.usualDose}
                </p>
              )}
            </Box>

            <Box>
              <Label htmlFor="route">Route</Label>
              <Select value={route} onValueChange={(v) => setRoute(v as DrugRoute)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUTE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>
          </Box>

          <Box className="grid grid-cols-2 gap-4">
            <Box>
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>

            <Box>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseInt(e.target.value, 10) || 0)}
                className="mt-1.5"
              />
            </Box>
          </Box>

          <Box className="grid grid-cols-2 gap-4">
            <Box>
              <Label htmlFor="days-supply">Days Supply</Label>
              <Select
                value={String(daysSupply)}
                onValueChange={(v) => setDaysSupply(parseInt(v, 10))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_SUPPLY_OPTIONS.map((days) => (
                    <SelectItem key={days} value={String(days)}>
                      {days} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>

            <Box>
              <Label htmlFor="refills">Refills Allowed</Label>
              <Input
                id="refills"
                type="number"
                min={0}
                max={selectedDrug?.schedule?.maxRefills ?? 11}
                value={refillsAllowed}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRefillsAllowed(parseInt(e.target.value, 10) || 0)
                }
                className="mt-1.5"
              />
              {selectedDrug?.schedule && !selectedDrug.schedule.refillAllowed && (
                <p className="text-xs text-destructive mt-1">
                  No refills allowed for this schedule
                </p>
              )}
            </Box>
          </Box>

          {/* SIG */}
          <Box>
            <Label htmlFor="sig">Directions (SIG)</Label>
            <textarea
              id="sig"
              value={sig}
              onChange={(e) => setSig(e.target.value)}
              placeholder="Directions for the patient..."
              className="w-full mt-1.5 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-y"
              rows={2}
            />
          </Box>

          {/* Actions */}
          <Flex gap="sm" justify="end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={!isValid || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Prescription
            </Button>
          </Flex>
        </form>
      </CardContent>
    </Card>
  );
});

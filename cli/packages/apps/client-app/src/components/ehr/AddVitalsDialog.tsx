/**
 * Add Vitals Dialog
 * Dialog for recording patient vital signs
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
} from "@lazarus-life/ui-components";
import { useState, useMemo } from "react";
import { useCreateEhrVital } from "@/hooks/api/ehr/useEhrVitals";
import { toast } from "sonner";

interface AddVitalsDialogProps {
  patientId: string;
  visitId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddVitalsDialog({
  patientId,
  visitId,
  open,
  onOpenChange,
  onSuccess,
}: AddVitalsDialogProps) {
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [respRate, setRespRate] = useState("");
  const [o2Sat, setO2Sat] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [pain, setPain] = useState("");
  const [takenAt, setTakenAt] = useState(
    new Date().toISOString().slice(0, 16) // YYYY-MM-DDThh:mm
  );

  const createVital = useCreateEhrVital();

  // Calculate BMI if weight and height are provided
  const bmi = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (w > 0 && h > 0) {
      // BMI = (weight in lbs * 703) / (height in inches)²
      return ((w * 703) / (h * h)).toFixed(1);
    }
    return "";
  }, [weight, height]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one vital is entered
    if (
      !bpSystolic &&
      !heartRate &&
      !temperature &&
      !respRate &&
      !o2Sat &&
      !weight &&
      !height &&
      !pain
    ) {
      toast.error("Please enter at least one vital sign");
      return;
    }

    // Validate BP if provided
    if ((bpSystolic && !bpDiastolic) || (!bpSystolic && bpDiastolic)) {
      toast.error("Blood pressure requires both systolic and diastolic values");
      return;
    }

    try {
      const vitals = [];

      // Blood Pressure
      if (bpSystolic && bpDiastolic) {
        vitals.push({
          patientId,
          visitId,
          vitalType: "BP" as const,
          value: `${bpSystolic}/${bpDiastolic}`,
          unit: "mmHg",
          takenAt,
        });
      }

      // Heart Rate
      if (heartRate) {
        vitals.push({
          patientId,
          visitId,
          vitalType: "HR" as const,
          value: heartRate,
          unit: "bpm",
          takenAt,
        });
      }

      // Temperature
      if (temperature) {
        vitals.push({
          patientId,
          visitId,
          vitalType: "TEMP" as const,
          value: temperature,
          unit: "°F",
          takenAt,
        });
      }

      // Respiratory Rate
      if (respRate) {
        vitals.push({
          patientId,
          visitId,
          vitalType: "RR" as const,
          value: respRate,
          unit: "breaths/min",
          takenAt,
        });
      }

      // Oxygen Saturation
      if (o2Sat) {
        vitals.push({
          patientId,
          visitId,
          vitalType: "O2SAT" as const,
          value: o2Sat,
          unit: "%",
          takenAt,
        });
      }

      // Weight
      if (weight) {
        vitals.push({
          patientId,
          visitId,
          vitalType: "WEIGHT" as const,
          value: weight,
          unit: "lbs",
          takenAt,
        });
      }

      // Height
      if (height) {
        vitals.push({
          patientId,
          visitId,
          vitalType: "HEIGHT" as const,
          value: height,
          unit: "in",
          takenAt,
        });
      }

      // BMI (calculated)
      if (bmi) {
        vitals.push({
          patientId,
          visitId,
          vitalType: "BMI" as const,
          value: bmi,
          unit: "kg/m²",
          takenAt,
        });
      }

      // Pain
      if (pain) {
        vitals.push({
          patientId,
          visitId,
          vitalType: "PAIN" as const,
          value: pain,
          unit: "/10",
          takenAt,
        });
      }

      // Create all vitals
      await Promise.all(vitals.map((vital) => createVital.mutateAsync(vital)));

      toast.success(`${vitals.length} vital sign${vitals.length > 1 ? "s" : ""} recorded`);

      // Reset form
      setBpSystolic("");
      setBpDiastolic("");
      setHeartRate("");
      setTemperature("");
      setRespRate("");
      setO2Sat("");
      setWeight("");
      setHeight("");
      setPain("");
      setTakenAt(new Date().toISOString().slice(0, 16));

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to record vital signs");
      console.error("Error recording vitals:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Vital Signs</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date/Time Taken */}
          <div className="space-y-2">
            <Label htmlFor="taken-at">Date & Time Taken</Label>
            <Input
              id="taken-at"
              type="datetime-local"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              max={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Blood Pressure */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bp-systolic">Systolic BP (mmHg)</Label>
              <Input
                id="bp-systolic"
                type="number"
                value={bpSystolic}
                onChange={(e) => setBpSystolic(e.target.value)}
                placeholder="e.g., 120"
                min="60"
                max="250"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-diastolic">Diastolic BP (mmHg)</Label>
              <Input
                id="bp-diastolic"
                type="number"
                value={bpDiastolic}
                onChange={(e) => setBpDiastolic(e.target.value)}
                placeholder="e.g., 80"
                min="40"
                max="150"
              />
            </div>
          </div>

          {/* Heart Rate & Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heart-rate">Heart Rate (bpm)</Label>
              <Input
                id="heart-rate"
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="e.g., 72"
                min="30"
                max="200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature (°F)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="e.g., 98.6"
                min="95"
                max="106"
              />
            </div>
          </div>

          {/* Respiratory Rate & O2 Saturation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resp-rate">Respiratory Rate (breaths/min)</Label>
              <Input
                id="resp-rate"
                type="number"
                value={respRate}
                onChange={(e) => setRespRate(e.target.value)}
                placeholder="e.g., 16"
                min="6"
                max="60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="o2-sat">Oxygen Saturation (%)</Label>
              <Input
                id="o2-sat"
                type="number"
                value={o2Sat}
                onChange={(e) => setO2Sat(e.target.value)}
                placeholder="e.g., 98"
                min="70"
                max="100"
              />
            </div>
          </div>

          {/* Weight & Height */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g., 150.5"
                min="50"
                max="500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (inches)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g., 68"
                min="40"
                max="90"
              />
            </div>
          </div>

          {/* BMI (calculated) & Pain */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>BMI (kg/m²)</Label>
              <Input
                value={bmi}
                disabled
                placeholder="Calculated from weight & height"
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pain">Pain Scale (0-10)</Label>
              <Input
                id="pain"
                type="number"
                value={pain}
                onChange={(e) => setPain(e.target.value)}
                placeholder="0 = No pain, 10 = Worst pain"
                min="0"
                max="10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createVital.isPending}>
              {createVital.isPending ? "Recording..." : "Record Vitals"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

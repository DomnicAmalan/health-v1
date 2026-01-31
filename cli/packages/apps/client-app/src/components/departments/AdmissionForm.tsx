/**
 * AdmissionForm Component
 * IPD patient admission form with bed allocation
 */

import { memo, useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Alert,
  AlertDescription,
  Skeleton,
} from "@lazarus-life/ui-components";
import { useWards, useWardBeds, useCreateAdmission } from "@/hooks/api/departments";
import { PatientSearch } from "@/components/ehr/PatientSearch";
import type { EhrPatient } from "@lazarus-life/shared";
import type {
  CreateAdmissionRequest,
  AdmissionType,
  Bed,
  Ward,
} from "@lazarus-life/shared/types/departments";

const admissionTypes: { value: AdmissionType; label: string }[] = [
  { value: "emergency", label: "Emergency" },
  { value: "elective", label: "Elective" },
  { value: "transfer_in", label: "Transfer from another facility" },
  { value: "daycare", label: "Day Care" },
];

interface BedSelectorProps {
  wardId: string;
  selectedBedId?: string;
  onSelect: (bed: Bed) => void;
}

const BedSelector = memo(function BedSelector({
  wardId,
  selectedBedId,
  onSelect,
}: BedSelectorProps) {
  const { data: bedsData, isLoading } = useWardBeds(wardId);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  const beds = bedsData ?? [];
  const availableBeds = beds.filter((b: Bed) => b.status === "vacant");

  if (availableBeds.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No beds available in this ward. Please select a different ward.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
      {availableBeds.map((bed) => (
        <button
          key={bed.id}
          type="button"
          onClick={() => onSelect(bed)}
          className={`
            p-3 rounded-lg border text-center transition-colors
            ${
              selectedBedId === bed.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }
          `}
        >
          <p className="font-medium">{bed.bedCode}</p>
          <p className="text-xs text-muted-foreground">
            {bed.bedType.replace("_", " ")}
          </p>
        </button>
      ))}
    </div>
  );
});

interface AdmissionFormProps {
  patientId?: string;
  patientName?: string;
  onSuccess?: (admissionId: string) => void;
  onCancel?: () => void;
}

export const AdmissionForm = memo(function AdmissionForm({
  patientId: initialPatientId,
  patientName: initialPatientName,
  onSuccess,
  onCancel,
}: AdmissionFormProps) {
  const [formData, setFormData] = useState<Partial<CreateAdmissionRequest>>({
    patientId: initialPatientId ?? "",
    admissionType: "elective",
    wardId: "",
    bedId: "",
    admittingDoctorId: "",
    attendingDoctorId: "",
    chiefComplaint: "",
    admissionNotes: "",
    expectedLOS: undefined,
  });
  const [patientName, setPatientName] = useState(initialPatientName ?? "");
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { data: wardsData, isLoading: wardsLoading } = useWards({ status: "active" });
  const createAdmissionMutation = useCreateAdmission();

  const wards = wardsData?.data ?? [];

  const handlePatientSelect = useCallback((patient: EhrPatient) => {
    setFormData((prev) => ({ ...prev, patientId: patient.id }));
    setPatientName(`${patient.lastName}, ${patient.firstName}`);
  }, []);

  const handleWardChange = useCallback(
    (wardId: string) => {
      const ward = wards.find((w: Ward) => w.id === wardId);
      setSelectedWard(ward ?? null);
      setFormData((prev) => ({ ...prev, wardId, bedId: "" }));
    },
    [wards]
  );

  const handleBedSelect = useCallback((bed: Bed) => {
    setFormData((prev) => ({ ...prev, bedId: bed.id }));
  }, []);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientId) {
      newErrors.patientId = "Patient is required";
    }
    if (!formData.wardId) {
      newErrors.wardId = "Ward is required";
    }
    if (!formData.bedId) {
      newErrors.bedId = "Bed is required";
    }
    if (!formData.admittingDoctorId) {
      newErrors.admittingDoctorId = "Admitting doctor is required";
    }
    if (!formData.chiefComplaint?.trim()) {
      newErrors.chiefComplaint = "Chief complaint is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      setConfirmDialogOpen(true);
    },
    [validate]
  );

  const handleConfirmAdmission = useCallback(async () => {
    try {
      const result = await createAdmissionMutation.mutateAsync(
        formData as CreateAdmissionRequest
      );
      setConfirmDialogOpen(false);
      onSuccess?.(result.id);
    } catch {
      // Error handling is done by the mutation
    }
  }, [formData, createAdmissionMutation, onSuccess]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
            <CardDescription>
              Select the patient to be admitted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {initialPatientId ? (
              <div>
                <Label>Patient</Label>
                <p className="text-lg font-medium">{patientName}</p>
                <p className="text-sm text-muted-foreground">
                  ID: {initialPatientId}
                </p>
              </div>
            ) : (
              <div>
                <Label>Search Patient</Label>
                <PatientSearch onSelect={handlePatientSelect} />
                {patientName && (
                  <p className="mt-2 text-sm">
                    Selected: <span className="font-medium">{patientName}</span>
                  </p>
                )}
                {errors.patientId && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.patientId}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admission Details */}
        <Card>
          <CardHeader>
            <CardTitle>Admission Details</CardTitle>
            <CardDescription>
              Enter the admission type and clinical information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admissionType">Admission Type</Label>
                <Select
                  value={formData.admissionType}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      admissionType: v as AdmissionType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {admissionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expectedLOS">Expected Stay (days)</Label>
                <Input
                  id="expectedLOS"
                  type="number"
                  min={1}
                  value={formData.expectedLOS ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      expectedLOS: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    }))
                  }
                  placeholder="e.g., 3"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="chiefComplaint">Chief Complaint *</Label>
              <Textarea
                id="chiefComplaint"
                value={formData.chiefComplaint ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    chiefComplaint: e.target.value,
                  }))
                }
                placeholder="Enter the primary reason for admission..."
                rows={3}
              />
              {errors.chiefComplaint && (
                <p className="text-sm text-destructive mt-1">
                  {errors.chiefComplaint}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="admissionNotes">Admission Notes</Label>
              <Textarea
                id="admissionNotes"
                value={formData.admissionNotes ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    admissionNotes: e.target.value,
                  }))
                }
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Doctor Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Physician Assignment</CardTitle>
            <CardDescription>
              Assign the admitting and attending physicians
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admittingDoctor">Admitting Doctor *</Label>
                <Input
                  id="admittingDoctor"
                  value={formData.admittingDoctorId ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      admittingDoctorId: e.target.value,
                    }))
                  }
                  placeholder="Enter doctor ID..."
                />
                {errors.admittingDoctorId && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.admittingDoctorId}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="attendingDoctor">Attending Doctor</Label>
                <Input
                  id="attendingDoctor"
                  value={formData.attendingDoctorId ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      attendingDoctorId: e.target.value,
                    }))
                  }
                  placeholder="Enter doctor ID (optional)..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ward and Bed Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Ward & Bed Allocation</CardTitle>
            <CardDescription>
              Select the ward and bed for the patient
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Ward *</Label>
              {wardsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={formData.wardId}
                  onValueChange={handleWardChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((ward) => (
                      <SelectItem key={ward.id} value={ward.id}>
                        {ward.wardName} ({ward.availableBeds} beds available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.wardId && (
                <p className="text-sm text-destructive mt-1">{errors.wardId}</p>
              )}
            </div>

            {selectedWard && (
              <div>
                <Label>Bed *</Label>
                <BedSelector
                  wardId={selectedWard.id}
                  selectedBedId={formData.bedId}
                  onSelect={handleBedSelect}
                />
                {errors.bedId && (
                  <p className="text-sm text-destructive mt-1">{errors.bedId}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={createAdmissionMutation.isPending}
          >
            {createAdmissionMutation.isPending ? "Admitting..." : "Admit Patient"}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Admission</DialogTitle>
            <DialogDescription>
              Please review the admission details before confirming.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Patient</p>
                <p className="font-medium">{patientName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Admission Type</p>
                <p className="font-medium">
                  {admissionTypes.find((t) => t.value === formData.admissionType)
                    ?.label}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Ward</p>
                <p className="font-medium">{selectedWard?.wardName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bed</p>
                <p className="font-medium">{formData.bedId?.slice(0, 8)}...</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Chief Complaint</p>
              <p className="font-medium">{formData.chiefComplaint}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Go Back
            </Button>
            <Button
              onClick={handleConfirmAdmission}
              disabled={createAdmissionMutation.isPending}
            >
              Confirm Admission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
});

export default AdmissionForm;

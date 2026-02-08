/**
 * Patient Form Dialog
 * Dialog for creating or editing a patient
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
} from "@lazarus-life/ui-components";
import { useState, useEffect } from "react";
import { useCreateEhrPatient, useUpdateEhrPatient } from "@/hooks/api/ehr/useEhrPatients";
import { toast } from "sonner";
import type { EhrPatient, EhrGender } from "@lazarus-life/shared/schemas/ehr";

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (patient: EhrPatient) => void;
  /** If provided, the dialog will be in edit mode */
  patient?: EhrPatient;
}

const GENDER_OPTIONS: { value: EhrGender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

const STATE_OPTIONS = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export function PatientFormDialog({
  open,
  onOpenChange,
  onSuccess,
  patient,
}: PatientFormDialogProps) {
  const isEditMode = !!patient;

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<EhrGender>("unknown");
  const [email, setEmail] = useState("");
  const [phoneHome, setPhoneHome] = useState("");
  const [phoneMobile, setPhoneMobile] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Mutations
  const createPatient = useCreateEhrPatient();
  const updatePatient = useUpdateEhrPatient();

  // Populate form when editing
  useEffect(() => {
    if (patient && open) {
      setFirstName(patient.firstName || "");
      setLastName(patient.lastName || "");
      setMiddleName(patient.middleName || "");
      setDateOfBirth(patient.dateOfBirth || "");
      setGender(patient.gender || "unknown");
      setEmail(patient.email || "");
      setPhoneHome(patient.phoneHome || "");
      setPhoneMobile(patient.phoneMobile || "");
      setAddressLine1(patient.addressLine1 || "");
      setAddressLine2(patient.addressLine2 || "");
      setCity(patient.city || "");
      setState(patient.state || "");
      setZipCode(patient.zipCode || "");
    }
  }, [patient, open]);

  // Reset form when dialog closes
  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setMiddleName("");
    setDateOfBirth("");
    setGender("unknown");
    setEmail("");
    setPhoneHome("");
    setPhoneMobile("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setState("");
    setZipCode("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!lastName.trim()) {
      toast.error("Last name is required");
      return;
    }
    if (!dateOfBirth) {
      toast.error("Date of birth is required");
      return;
    }

    // Validate date of birth is not in future
    const dob = new Date(dateOfBirth);
    if (dob > new Date()) {
      toast.error("Date of birth cannot be in the future");
      return;
    }

    try {
      // Build patient data - use type assertion for branded types
      // since we're doing frontend validation before submission
      const patientData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || undefined,
        dateOfBirth,
        gender,
        email: email.trim() || undefined,
        phoneHome: phoneHome.trim() || undefined,
        phoneMobile: phoneMobile.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim() || undefined,
        state: state || undefined,
        zipCode: zipCode.trim() || undefined,
      } as const;

      let result: EhrPatient;

      if (isEditMode && patient) {
        result = await updatePatient.mutateAsync({
          id: patient.id,
          ...patientData,
        } as Parameters<typeof updatePatient.mutateAsync>[0]);
        toast.success("Patient updated successfully");
      } else {
        result = await createPatient.mutateAsync(
          patientData as Parameters<typeof createPatient.mutateAsync>[0]
        );
        toast.success("Patient created successfully");
      }

      resetForm();
      onSuccess?.(result);
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditMode ? "Failed to update patient" : "Failed to create patient");
      console.error("Error saving patient:", error);
    }
  };

  const isPending = createPatient.isPending || updatePatient.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Patient" : "New Patient"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middle-name">Middle Name</Label>
                <Input
                  id="middle-name"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Michael"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          {/* Demographics Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Demographics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-of-birth">
                  Date of Birth <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date-of-birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={(val) => setGender(val as EhrGender)}>
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone-home">Home Phone</Label>
                <Input
                  id="phone-home"
                  type="tel"
                  value={phoneHome}
                  onChange={(e) => setPhoneHome(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone-mobile">Mobile Phone</Label>
                <Input
                  id="phone-mobile"
                  type="tel"
                  value={phoneMobile}
                  onChange={(e) => setPhoneMobile(e.target.value)}
                  placeholder="(555) 987-6543"
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address-line1">Address Line 1</Label>
                <Input
                  id="address-line1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="123 Main Street"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address-line2">Address Line 2</Label>
                <Input
                  id="address-line2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apt 4B"
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Los Angeles"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATE_OPTIONS.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip-code">ZIP Code</Label>
                  <Input
                    id="zip-code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="90001"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditMode ? "Update Patient" : "Create Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

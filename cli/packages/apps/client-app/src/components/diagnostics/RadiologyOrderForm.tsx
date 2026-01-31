/**
 * Radiology Order Form Component
 * Form for creating radiology examination orders
 */

import { memo, useCallback, useState } from "react";
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@lazarus-life/ui-components";
import { Search, Plus, X, Scan } from "lucide-react";
import type {
  RadiologyExamType,
  Urgency,
  Modality,
  BodyPart,
} from "@lazarus-life/shared";

interface RadiologyOrderFormProps {
  patientId: string;
  examTypes: RadiologyExamType[];
  onSubmit: (data: {
    patientId: string;
    orderingDoctorId: string;
    urgency: Urgency;
    examTypeIds: string[];
    clinicalHistory: string;
    reasonForExam: string;
    pregnancyStatus?: "not_pregnant" | "pregnant" | "unknown";
    allergies?: string[];
    specialInstructions?: string;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const modalityIcons: Record<Modality, string> = {
  xray: "X",
  ct: "CT",
  mri: "MR",
  ultrasound: "US",
  fluoroscopy: "FL",
  mammography: "MG",
  nuclear: "NM",
  pet: "PT",
  angiography: "AG",
  dexa: "DX",
  other: "OT",
};

const bodyPartLabels: Record<BodyPart, string> = {
  head: "Head",
  neck: "Neck",
  chest: "Chest",
  abdomen: "Abdomen",
  pelvis: "Pelvis",
  spine: "Spine",
  upper_extremity: "Upper Extremity",
  lower_extremity: "Lower Extremity",
  whole_body: "Whole Body",
  other: "Other",
};

export const RadiologyOrderForm = memo(function RadiologyOrderForm({
  patientId,
  examTypes,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: RadiologyOrderFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(
    new Set()
  );
  const [modalityFilter, setModalityFilter] = useState<Modality | "all">("all");
  const [bodyPartFilter, setBodyPartFilter] = useState<BodyPart | "all">("all");
  const [urgency, setUrgency] = useState<Urgency>("routine");
  const [clinicalHistory, setClinicalHistory] = useState("");
  const [reasonForExam, setReasonForExam] = useState("");
  const [pregnancyStatus, setPregnancyStatus] = useState<
    "not_pregnant" | "pregnant" | "unknown"
  >("unknown");
  const [allergies, setAllergies] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const filteredExams = examTypes.filter((exam) => {
    const matchesSearch =
      exam.examName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.examCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.cptCode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModality =
      modalityFilter === "all" || exam.modality === modalityFilter;
    const matchesBodyPart =
      bodyPartFilter === "all" || exam.bodyPart === bodyPartFilter;

    return matchesSearch && matchesModality && matchesBodyPart;
  });

  const handleExamToggle = useCallback((examId: string) => {
    setSelectedExamIds((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) {
        next.delete(examId);
      } else {
        next.add(examId);
      }
      return next;
    });
  }, []);

  const handleRemoveExam = useCallback((examId: string) => {
    setSelectedExamIds((prev) => {
      const next = new Set(prev);
      next.delete(examId);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedExamIds.size === 0) return;

      onSubmit({
        patientId,
        orderingDoctorId: "", // Would come from auth context
        urgency,
        examTypeIds: Array.from(selectedExamIds),
        clinicalHistory,
        reasonForExam,
        pregnancyStatus,
        allergies: allergies ? allergies.split(",").map((a) => a.trim()) : [],
        specialInstructions: specialInstructions || undefined,
      });
    },
    [
      patientId,
      selectedExamIds,
      urgency,
      clinicalHistory,
      reasonForExam,
      pregnancyStatus,
      allergies,
      specialInstructions,
      onSubmit,
    ]
  );

  const selectedExams = examTypes.filter((e) => selectedExamIds.has(e.id));
  const hasContrastExams = selectedExams.some((e) => e.requiresContrast);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Exam Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scan className="h-5 w-5" />
              Available Exams
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search & Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search exams by name, code, or CPT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={modalityFilter}
                  onValueChange={(v) =>
                    setModalityFilter(v as Modality | "all")
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Modality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modalities</SelectItem>
                    <SelectItem value="xray">X-Ray</SelectItem>
                    <SelectItem value="ct">CT</SelectItem>
                    <SelectItem value="mri">MRI</SelectItem>
                    <SelectItem value="ultrasound">Ultrasound</SelectItem>
                    <SelectItem value="fluoroscopy">Fluoroscopy</SelectItem>
                    <SelectItem value="mammography">Mammography</SelectItem>
                    <SelectItem value="nuclear">Nuclear Med</SelectItem>
                    <SelectItem value="pet">PET</SelectItem>
                    <SelectItem value="dexa">DEXA</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={bodyPartFilter}
                  onValueChange={(v) =>
                    setBodyPartFilter(v as BodyPart | "all")
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Body Part" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Body Parts</SelectItem>
                    {Object.entries(bodyPartLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exam List */}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {filteredExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedExamIds.has(exam.id)}
                      onCheckedChange={() => handleExamToggle(exam.id)}
                    />
                    <Badge
                      variant="outline"
                      className="w-8 justify-center font-mono"
                    >
                      {modalityIcons[exam.modality]}
                    </Badge>
                    <div>
                      <div className="font-medium">{exam.examName}</div>
                      <div className="text-sm text-muted-foreground">
                        {exam.examCode}
                        {exam.cptCode && ` • CPT: ${exam.cptCode}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {exam.requiresContrast && (
                      <Badge variant="secondary">Contrast</Badge>
                    )}
                    <Badge variant="outline">
                      {bodyPartLabels[exam.bodyPart]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Exams & Order Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Selected Exams ({selectedExams.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedExams.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No exams selected. Search and select exams from the left
                  panel.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between rounded-md bg-muted p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono"
                        >
                          {modalityIcons[exam.modality]}
                        </Badge>
                        <div>
                          <div className="font-medium">{exam.examName}</div>
                          <div className="text-sm text-muted-foreground">
                            {exam.requiresContrast && "Requires contrast"}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExam(exam.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={urgency}
                    onValueChange={(v) => setUrgency(v as Urgency)}
                  >
                    <SelectTrigger id="urgency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT</SelectItem>
                      <SelectItem value="asap">ASAP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pregnancy">Pregnancy Status</Label>
                  <Select
                    value={pregnancyStatus}
                    onValueChange={(v) =>
                      setPregnancyStatus(
                        v as "not_pregnant" | "pregnant" | "unknown"
                      )
                    }
                  >
                    <SelectTrigger id="pregnancy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_pregnant">Not Pregnant</SelectItem>
                      <SelectItem value="pregnant">Pregnant</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Exam *</Label>
                <Input
                  id="reason"
                  placeholder="Primary indication for examination..."
                  value={reasonForExam}
                  onChange={(e) => setReasonForExam(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="history">Clinical History *</Label>
                <Textarea
                  id="history"
                  placeholder="Relevant clinical history..."
                  value={clinicalHistory}
                  onChange={(e) => setClinicalHistory(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              {hasContrastExams && (
                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies (contrast-related)</Label>
                  <Input
                    id="allergies"
                    placeholder="List any allergies, separated by commas..."
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="instructions">Special Instructions</Label>
                <Input
                  id="instructions"
                  placeholder="Any special instructions..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            selectedExamIds.size === 0 ||
            !clinicalHistory ||
            !reasonForExam ||
            isSubmitting
          }
        >
          {isSubmitting ? "Creating Order..." : "Create Radiology Order"}
        </Button>
      </div>
    </form>
  );
});

/**
 * Report Editor Component
 * Create and edit radiology reports
 */

import { memo, useCallback, useState } from "react";
import {
  Button,
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
import { AlertTriangle, FileText, CheckCircle, Image } from "lucide-react";
import type {
  RadiologyExam,
  RadiologyReport,
  RadiologyTemplate,
} from "@lazarus-life/shared";

interface ReportEditorProps {
  exam: RadiologyExam;
  templates: RadiologyTemplate[];
  existingReport?: RadiologyReport;
  onSave: (report: {
    examId: string;
    findings: string;
    impression: string;
    recommendation?: string;
    isCritical: boolean;
    status: "draft" | "preliminary" | "final";
  }) => void;
  onSign: (reportId: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ReportEditor = memo(function ReportEditor({
  exam,
  templates,
  existingReport,
  onSave,
  onSign,
  onCancel,
  isSubmitting = false,
}: ReportEditorProps) {
  const [findings, setFindings] = useState(existingReport?.findings || "");
  const [impression, setImpression] = useState(existingReport?.impression || "");
  const [recommendation, setRecommendation] = useState(
    existingReport?.recommendation || ""
  );
  const [isCritical, setIsCritical] = useState(existingReport?.isCritical || false);
  const [status, setStatus] = useState<"draft" | "preliminary" | "final">(() => {
    if (!existingReport?.status || existingReport.status === "pending") return "draft";
    if (existingReport.status === "addendum" || existingReport.status === "corrected") return "final";
    return existingReport.status;
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setFindings(template.findingsTemplate || "");
        setImpression(template.impressionTemplate || "");
        setRecommendation(template.recommendationTemplate || "");
        setSelectedTemplateId(templateId);
      }
    },
    [templates]
  );

  const handleSave = useCallback(
    (saveStatus: "draft" | "preliminary" | "final") => {
      onSave({
        examId: exam.id,
        findings,
        impression,
        recommendation: recommendation || undefined,
        isCritical,
        status: saveStatus,
      });
    },
    [exam.id, findings, impression, recommendation, isCritical, onSave]
  );

  const handleSign = useCallback(() => {
    if (existingReport?.id) {
      onSign(existingReport.id);
    }
  }, [existingReport?.id, onSign]);

  const modalityTemplates = templates.filter(
    (t) => t.modality === exam.modality
  );

  return (
    <div className="space-y-6">
      {/* Exam Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Exam Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Exam #</p>
              <p className="font-medium">{exam.examNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Patient</p>
              <p className="font-medium">{exam.patientId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Modality</p>
              <Badge variant="outline">{exam.modality?.toUpperCase()}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Exam Date</p>
              <p className="font-medium">
                {exam.completedAt
                  ? new Date(exam.completedAt).toLocaleDateString()
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Accession #</p>
              <p className="font-medium">{exam.accessionNumber || "-"}</p>
            </div>
          </div>
          {exam.clinicalHistory && (
            <div className="mt-4">
              <p className="text-muted-foreground">Clinical History</p>
              <p className="mt-1">{exam.clinicalHistory}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Selection */}
      {modalityTemplates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Report Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select
                value={selectedTemplateId}
                onValueChange={handleApplyTemplate}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {modalityTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.templateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                Templates provide standard report structure
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Findings */}
          <div className="space-y-2">
            <Label htmlFor="findings" className="text-base">
              Findings *
            </Label>
            <Textarea
              id="findings"
              placeholder="Describe the imaging findings..."
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={8}
              className="font-mono"
              required
            />
          </div>

          {/* Impression */}
          <div className="space-y-2">
            <Label htmlFor="impression" className="text-base">
              Impression *
            </Label>
            <Textarea
              id="impression"
              placeholder="Summary impression and diagnosis..."
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              rows={4}
              className="font-mono"
              required
            />
          </div>

          {/* Recommendation */}
          <div className="space-y-2">
            <Label htmlFor="recommendation" className="text-base">
              Recommendation
            </Label>
            <Textarea
              id="recommendation"
              placeholder="Follow-up recommendations..."
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={3}
              className="font-mono"
            />
          </div>

          {/* Critical Finding */}
          <div className="flex items-center space-x-2 rounded-md border border-red-200 bg-red-50 p-4">
            <Checkbox
              id="critical"
              checked={isCritical}
              onCheckedChange={(checked) => setIsCritical(checked === true)}
            />
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <Label htmlFor="critical" className="font-medium text-red-700">
                Critical Finding - Requires Immediate Notification
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Label htmlFor="status">Report Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as "draft" | "preliminary" | "final")
                }
              >
                <SelectTrigger id="status" className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="preliminary">Preliminary</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
              {existingReport?.signedAt && (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Signed
                </Badge>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSave("draft")}
                disabled={isSubmitting}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSave("preliminary")}
                disabled={!findings || !impression || isSubmitting}
              >
                Save as Preliminary
              </Button>
              <Button
                type="button"
                onClick={() => handleSave("final")}
                disabled={!findings || !impression || isSubmitting}
              >
                Save as Final
              </Button>
              {existingReport && !existingReport.signedAt && (
                <Button
                  type="button"
                  variant="default"
                  onClick={handleSign}
                  disabled={
                    existingReport.status !== "final" || isSubmitting
                  }
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Sign Report
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Warning */}
      {isCritical && (
        <div className="flex items-center gap-2 rounded-md border-l-4 border-red-500 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="font-medium text-red-700">
            This report contains critical findings. Upon signing, you will be
            prompted to notify the ordering physician immediately.
          </span>
        </div>
      )}
    </div>
  );
});

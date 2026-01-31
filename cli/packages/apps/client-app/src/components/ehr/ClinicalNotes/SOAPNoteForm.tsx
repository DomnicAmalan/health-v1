/**
 * SOAPNoteForm Component
 * Form for creating SOAP (Subjective, Objective, Assessment, Plan) notes
 */

import type { SoapNoteContent, CreateEhrDocumentRequest } from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
  Label,
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import { FileText, Loader2, Save, Send, X } from "lucide-react";
import { memo, useState, useCallback } from "react";
import { useCreateEhrDocument, useSignEhrDocument } from "@/hooks/api/ehr";

interface SOAPNoteFormProps {
  patientId: string;
  visitId?: string;
  onSuccess?: (documentId: string) => void;
  onCancel?: () => void;
  className?: string;
}

const SECTION_LABELS: Record<keyof SoapNoteContent, string> = {
  subjective: "Subjective",
  objective: "Objective",
  assessment: "Assessment",
  plan: "Plan",
};

const SECTION_PLACEHOLDERS: Record<keyof SoapNoteContent, string> = {
  subjective:
    "Chief complaint, history of present illness, review of systems, relevant past medical/surgical/family/social history...",
  objective:
    "Vital signs, physical exam findings, relevant lab/imaging results...",
  assessment: "Diagnoses, differential diagnoses, clinical impressions...",
  plan: "Treatment plan, medications, follow-up, patient education, referrals...",
};

const SECTION_KEYS: Array<keyof SoapNoteContent> = [
  "subjective",
  "objective",
  "assessment",
  "plan",
];

export const SOAPNoteForm = memo(function SOAPNoteForm({
  patientId,
  visitId,
  onSuccess,
  onCancel,
  className,
}: SOAPNoteFormProps) {
  const [content, setContent] = useState<SoapNoteContent>({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [title, setTitle] = useState("SOAP Note");
  const [signAfterSave, setSignAfterSave] = useState(false);

  const createMutation = useCreateEhrDocument();
  const signMutation = useSignEhrDocument();

  const handleSectionChange = useCallback(
    (section: keyof SoapNoteContent, value: string) => {
      setContent((prev) => ({ ...prev, [section]: value }));
    },
    []
  );

  const formatContent = useCallback(() => {
    const sections = [
      `SUBJECTIVE:\n${content.subjective || "(Not documented)"}`,
      `OBJECTIVE:\n${content.objective || "(Not documented)"}`,
      `ASSESSMENT:\n${content.assessment || "(Not documented)"}`,
      `PLAN:\n${content.plan || "(Not documented)"}`,
    ];
    return sections.join("\n\n");
  }, [content]);

  const handleSave = useCallback(
    async (sign: boolean = false) => {
      const documentRequest: CreateEhrDocumentRequest = {
        patientId,
        visitId,
        documentType: "soap_note",
        title,
        content: formatContent(),
        structuredContent: content as unknown as Record<string, unknown>,
        referenceDatetime: new Date().toISOString(),
      };

      try {
        const result = await createMutation.mutateAsync(documentRequest);

        if (sign && result.id) {
          await signMutation.mutateAsync(result.id);
        }

        onSuccess?.(result.id);
      } catch (error) {
        console.error("Failed to save note:", error);
      }
    },
    [patientId, visitId, title, content, formatContent, createMutation, signMutation, onSuccess]
  );

  const isLoading = createMutation.isPending || signMutation.isPending;
  const hasContent = Object.values(content).some((v) => v.trim().length > 0);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            New SOAP Note
          </CardTitle>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </Flex>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Title */}
        <Box>
          <Label htmlFor="note-title">Title</Label>
          <input
            id="note-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1.5 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Note title"
          />
        </Box>

        {/* SOAP Sections */}
        {SECTION_KEYS.map((section) => (
          <Box key={section}>
            <Label htmlFor={`soap-${section}`} className="text-base font-semibold">
              {SECTION_LABELS[section]}
            </Label>
            <textarea
              id={`soap-${section}`}
              value={content[section]}
              onChange={(e) => handleSectionChange(section, e.target.value)}
              placeholder={SECTION_PLACEHOLDERS[section]}
              className="w-full mt-1.5 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px] resize-y"
            />
          </Box>
        ))}

        {/* Actions */}
        <Flex gap="sm" className="w-full" justify="end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isLoading || !hasContent}
          >
            {isLoading && !signAfterSave ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save as Draft
          </Button>
          <Button
            onClick={() => {
              setSignAfterSave(true);
              handleSave(true);
            }}
            disabled={isLoading || !hasContent}
          >
            {isLoading && signAfterSave ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Save & Sign
          </Button>
        </Flex>
      </CardContent>
    </Card>
  );
});

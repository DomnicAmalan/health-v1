/**
 * DocumentList Component
 * Displays patient's clinical documents (progress notes, discharge summaries, etc.)
 */

import type { EhrDocument } from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
} from "@lazarus-life/ui-components";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className || ""}`} />
);
import { cn } from "@lazarus-life/ui-components/utils";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileCheck,
  FileText,
  FilePen,
  Plus,
  User,
} from "lucide-react";
import { memo } from "react";
import { useEhrPatientDocuments } from "@/hooks/api/ehr";

interface DocumentListProps {
  patientId: string;
  visitId?: string;
  documentType?: string;
  onAddDocument?: () => void;
  onSelectDocument?: (document: EhrDocument) => void;
  compact?: boolean;
  className?: string;
  limit?: number;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DocumentTypeLabel({ documentType }: { documentType: string }) {
  const labels: Record<string, string> = {
    progress_note: "Progress Note",
    hp_note: "H&P Note",
    discharge_summary: "Discharge Summary",
    consultation: "Consultation",
    procedure_note: "Procedure Note",
    operative_report: "Operative Report",
    radiology_report: "Radiology Report",
    lab_report: "Lab Report",
    nursing_note: "Nursing Note",
  };
  return <span>{labels[documentType] || documentType}</span>;
}

function DocumentStatusBadge({ status }: { status: EhrDocument["status"] }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle; label: string }> = {
    draft: { variant: "outline", icon: FilePen, label: "Draft" },
    unsigned: { variant: "secondary", icon: AlertTriangle, label: "Unsigned" },
    signed: { variant: "default", icon: FileCheck, label: "Signed" },
    cosigned: { variant: "default", icon: CheckCircle, label: "Co-signed" },
    amended: { variant: "secondary", icon: FilePen, label: "Amended" },
    deleted: { variant: "destructive", icon: AlertCircle, label: "Deleted" },
  };

  const statusConfig = config[status] || { variant: "outline" as const, icon: FileText, label: status };
  const Icon = statusConfig.icon;

  return (
    <Badge variant={statusConfig.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  );
}

interface DocumentItemProps {
  document: EhrDocument;
  onSelect?: (document: EhrDocument) => void;
  compact?: boolean;
}

const DocumentItem = memo(function DocumentItem({
  document,
  onSelect,
  compact,
}: DocumentItemProps) {
  const needsSignature = document.status === "draft" || document.status === "unsigned";

  return (
    <Box
      className={cn(
        "border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer",
        needsSignature && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
      )}
      onClick={() => onSelect?.(document)}
    >
      <Flex align="start" gap="sm">
        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
        <Box className="flex-1 min-w-0">
          <Flex align="center" gap="sm" className="mb-1">
            <span className="font-medium">
              <DocumentTypeLabel documentType={document.documentType} />
            </span>
            <DocumentStatusBadge status={document.status} />
          </Flex>

          {document.title && (
            <p className="text-sm truncate">{document.title}</p>
          )}

          {!compact && (
            <>
              <Flex gap="md" className="text-sm text-muted-foreground mt-1">
                <Flex align="center" gap="xs">
                  <Clock className="h-3 w-3" />
                  <span>{formatDateTime(document.createdAt)}</span>
                </Flex>
              </Flex>

              {document.authorName && (
                <Flex align="center" gap="xs" className="text-sm text-muted-foreground mt-1">
                  <User className="h-3 w-3" />
                  <span>{document.authorName}</span>
                </Flex>
              )}

              {document.signedDatetime && document.signerName && (
                <Flex align="center" gap="xs" className="text-xs text-green-600 mt-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Signed by {document.signerName} on {formatDate(document.signedDatetime)}</span>
                </Flex>
              )}

              {needsSignature && (
                <Flex align="center" gap="xs" className="text-xs text-amber-600 mt-2">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Requires signature</span>
                </Flex>
              )}
            </>
          )}
        </Box>
      </Flex>
    </Box>
  );
});

export const DocumentList = memo(function DocumentList({
  patientId,
  visitId,
  documentType,
  onAddDocument,
  onSelectDocument,
  compact = false,
  className,
  limit,
}: DocumentListProps) {
  const { data, isLoading, error } = useEhrPatientDocuments(patientId, limit ? { limit, offset: 0 } : undefined);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load documents</p>
          </Box>
        </CardContent>
      </Card>
    );
  }

  let documents = data?.items ?? [];
  if (visitId) {
    documents = documents.filter((d) => d.visitId === visitId);
  }
  if (documentType) {
    documents = documents.filter((d) => d.documentType === documentType);
  }

  const unsignedDocs = documents.filter(
    (d) => d.status === "draft" || d.status === "unsigned"
  );

  return (
    <Card className={className}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
            {unsignedDocs.length > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                {unsignedDocs.length} unsigned
              </Badge>
            )}
          </CardTitle>
          {onAddDocument && (
            <Button variant="outline" size="sm" onClick={onAddDocument}>
              <Plus className="h-4 w-4 mr-1" />
              New Note
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <Box className="text-center text-muted-foreground py-8">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No documents</p>
          </Box>
        ) : (
          <Box className="space-y-2">
            {documents.map((document) => (
              <DocumentItem
                key={document.id}
                document={document}
                onSelect={onSelectDocument}
                compact={compact}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

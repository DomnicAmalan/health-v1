/**
 * Clinical Page
 * Clinical documentation with templates, unsigned documents, and recent documents
 */

import { useState, useCallback } from "react";
import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import type { EhrDocument } from "@lazarus-life/shared/types/ehr";
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Flex,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle,
  FileText,
  FilePlus,
  PenLine,
  Plus,
  Clock,
} from "lucide-react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import {
  useEhrUnsignedDocuments,
  useSignEhrDocument,
  useCosignEhrDocument,
} from "@/hooks/api/ehr/useEhrDocuments";

export const Route = createFileRoute("/clinical")({
  component: ClinicalComponent,
});

function ClinicalComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.CLINICAL.VIEW} resource="clinical">
      <ClinicalPageInner />
    </ProtectedRoute>
  );
}

function ClinicalPageInner() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedDocument, setSelectedDocument] = useState<EhrDocument | null>(null);

  // Data hooks
  const { data: unsignedData, isLoading: unsignedLoading } = useEhrUnsignedDocuments();

  const unsignedDocuments = Array.isArray(unsignedData) ? unsignedData : [];

  // Mutations
  const signDocument = useSignEhrDocument();
  const cosignDocument = useCosignEhrDocument();

  const handleSign = useCallback(
    async (id: string) => {
      await signDocument.mutateAsync(id);
    },
    [signDocument],
  );

  const handleCosign = useCallback(
    async (id: string) => {
      await cosignDocument.mutateAsync(id);
    },
    [cosignDocument],
  );

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" justify="between">
        <Box>
          <h1 className="text-3xl font-bold">{t("clinical.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("clinical.documentationTemplates")}</p>
        </Box>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("quickActions.createClinicalNote")}
        </Button>
      </Flex>

      {/* Stats Cards */}
      <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("unsigned")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <PenLine className="h-6 w-6 text-yellow-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{unsignedDocuments.length}</p>
                <p className="text-sm text-muted-foreground">Unsigned Documents</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("templates")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <FilePlus className="h-6 w-6 text-blue-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm text-muted-foreground">Templates Available</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Signed Today</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <FilePlus className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="unsigned" className="gap-2">
            <PenLine className="h-4 w-4" />
            Unsigned
            {unsignedDocuments.length > 0 && (
              <Badge variant="secondary">{unsignedDocuments.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-2">
            <Clock className="h-4 w-4" />
            Recent
          </TabsTrigger>
        </TabsList>

        <Box className="mt-4">
          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>{t("clinical.documentationTemplates")}</CardTitle>
                <CardDescription>{t("clinical.selectTemplate")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Box className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{t("clinical.templates.progressNote")}</CardTitle>
                      <CardDescription>{t("clinical.templates.progressNoteDesc")}</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("clinical.templates.historyPhysical")}
                      </CardTitle>
                      <CardDescription>{t("clinical.templates.historyPhysicalDesc")}</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("clinical.templates.dischargeSummary")}
                      </CardTitle>
                      <CardDescription>{t("clinical.templates.dischargeSummaryDesc")}</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("clinical.templates.operativeReport")}
                      </CardTitle>
                      <CardDescription>{t("clinical.templates.operativeReportDesc")}</CardDescription>
                    </CardHeader>
                  </Card>
                </Box>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unsigned Documents Tab */}
          <TabsContent value="unsigned">
            {unsignedLoading ? (
              <Box className="text-center py-8 text-muted-foreground">Loading unsigned documents...</Box>
            ) : unsignedDocuments.length === 0 ? (
              <Box className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No unsigned documents</p>
              </Box>
            ) : (
              <Box className="space-y-2">
                {unsignedDocuments.map((doc) => (
                  <Card
                    key={doc.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <Flex align="center" gap="md" className="flex-1">
                        <Box className="p-2 rounded-lg bg-muted">
                          <FileText className="h-4 w-4" />
                        </Box>
                        <Box>
                          <p className="font-medium">{doc.documentType || "Document"}</p>
                          <p className="text-sm text-muted-foreground">
                            Patient: {doc.patientId}
                            {doc.createdAt && (
                              <> &middot; {new Date(doc.createdAt).toLocaleDateString()}</>
                            )}
                          </p>
                        </Box>
                      </Flex>
                      <Flex align="center" gap="sm">
                        <Badge variant="secondary">Unsigned</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleSign(doc.id);
                          }}
                          disabled={signDocument.isPending}
                        >
                          <PenLine className="h-3 w-3 mr-1" />
                          Sign
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleCosign(doc.id);
                          }}
                          disabled={cosignDocument.isPending}
                        >
                          Cosign
                        </Button>
                      </Flex>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </TabsContent>

          {/* Recent Documents Tab */}
          <TabsContent value="recent">
            <Box className="text-center py-12 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a patient to view recent documents</p>
            </Box>
          </TabsContent>
        </Box>
      </Tabs>

      {/* Document Detail Dialog */}
      <Dialog
        open={!!selectedDocument}
        onOpenChange={(open: boolean) => !open && setSelectedDocument(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <Box className="space-y-4">
              <Flex align="center" gap="sm">
                <FileText className="h-5 w-5" />
                <span className="font-medium text-lg">
                  {selectedDocument.documentType || "Document"}
                </span>
              </Flex>

              <Box className="grid grid-cols-2 gap-4 text-sm">
                <Box>
                  <span className="text-muted-foreground">Document ID</span>
                  <p className="font-mono">{selectedDocument.id}</p>
                </Box>
                <Box>
                  <span className="text-muted-foreground">Patient</span>
                  <p>{selectedDocument.patientId}</p>
                </Box>
                {selectedDocument.createdAt && (
                  <Box>
                    <span className="text-muted-foreground">Created</span>
                    <p>{new Date(selectedDocument.createdAt).toLocaleString()}</p>
                  </Box>
                )}
                <Box>
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">Unsigned</Badge>
                </Box>
              </Box>

              {selectedDocument.content && (
                <Box>
                  <span className="text-muted-foreground text-sm">Content</span>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selectedDocument.content}</p>
                </Box>
              )}

              <Flex gap="sm" className="pt-2">
                <Button size="sm" onClick={() => handleSign(selectedDocument.id)}>
                  <PenLine className="h-4 w-4 mr-1" />
                  Sign
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCosign(selectedDocument.id)}
                >
                  Cosign
                </Button>
              </Flex>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

/**
 * Compliance Assessments Management
 * Create and track compliance assessments with scoring
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Edit, Eye, Calendar, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/compliance/assessments")({
  component: ComplianceAssessmentsComponent,
});

function ComplianceAssessmentsComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.COMPLIANCE.MANAGE} resource="compliance">
      <ComplianceAssessmentsInner />
    </ProtectedRoute>
  );
}

type AssessmentStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

interface Assessment {
  id: string;
  assessmentDate: string;
  organizationId: string;
  organizationName?: string;
  facilityId?: string;
  facilityName?: string;
  assessorId: string;
  assessorName?: string;
  status: AssessmentStatus;
  complianceScore?: number;
  findings?: string;
  nextAssessmentDate?: string;
  version: number;
  createdAt: string;
  completedAt?: string;
}

function ComplianceAssessmentsInner() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | "ALL">("ALL");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Form state
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [organizationId, setOrganizationId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [assessorId, setAssessorId] = useState("");
  const [findings, setFindings] = useState("");
  const [complianceScore, setComplianceScore] = useState("0");
  const [nextAssessmentDate, setNextAssessmentDate] = useState("");

  // Fetch assessments
  const { data: assessments, isLoading } = useQuery({
    queryKey: ["compliance-assessments", searchQuery, statusFilter],
    queryFn: () =>
      apiClient.get<Assessment[]>("/v1/compliance/assessments", {
        params: {
          search: searchQuery || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
        },
      }),
  });

  // Fetch organizations for dropdown
  const { data: organizations } = useQuery({
    queryKey: ["organizations"],
    queryFn: () =>
      apiClient.get<Array<{ id: string; name: string }>>("/v1/organizations"),
  });

  // Create assessment mutation
  const createAssessment = useMutation({
    mutationFn: (data: Partial<Assessment>) =>
      apiClient.post("/v1/compliance/assessments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-assessments"] });
      toast.success("Assessment created successfully");
      resetForm();
      setShowCreateDialog(false);
    },
    onError: () => {
      toast.error("Failed to create assessment");
    },
  });

  // Update assessment mutation
  const updateAssessment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Assessment> }) =>
      apiClient.patch(`/v1/compliance/assessments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-assessments"] });
      toast.success("Assessment updated successfully");
      resetForm();
      setSelectedAssessment(null);
    },
    onError: () => {
      toast.error("Failed to update assessment");
    },
  });

  // Complete assessment mutation
  const completeAssessment = useMutation({
    mutationFn: ({ id, score, findings: assessmentFindings, nextDate }: {
      id: string;
      score: number;
      findings: string;
      nextDate?: string;
    }) =>
      apiClient.post(`/v1/compliance/assessments/${id}/complete`, {
        complianceScore: score,
        findings: assessmentFindings,
        nextAssessmentDate: nextDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-assessments"] });
      toast.success("Assessment completed successfully");
      setShowDetailsDialog(false);
    },
    onError: () => {
      toast.error("Failed to complete assessment");
    },
  });

  const resetForm = () => {
    setAssessmentDate(new Date().toISOString().split("T")[0]);
    setOrganizationId("");
    setFacilityId("");
    setAssessorId("");
    setFindings("");
    setComplianceScore("0");
    setNextAssessmentDate("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const assessmentData = {
      assessmentDate,
      organizationId,
      facilityId: facilityId || undefined,
      assessorId,
      status: "SCHEDULED" as const,
    };

    if (selectedAssessment) {
      updateAssessment.mutate({ id: selectedAssessment.id, data: assessmentData });
    } else {
      createAssessment.mutate(assessmentData);
    }
  };

  const handleComplete = () => {
    if (!selectedAssessment) return;

    completeAssessment.mutate({
      id: selectedAssessment.id,
      score: parseFloat(complianceScore),
      findings,
      nextDate: nextAssessmentDate || undefined,
    });
  };

  const getStatusBadge = (status: AssessmentStatus) => {
    const variants = {
      SCHEDULED: { variant: "secondary" as const, label: "Scheduled", icon: Calendar },
      IN_PROGRESS: { variant: "default" as const, label: "In Progress", icon: AlertTriangle },
      COMPLETED: { variant: "default" as const, label: "Completed", icon: CheckCircle, className: "bg-green-600" },
      OVERDUE: { variant: "destructive" as const, label: "Overdue", icon: XCircle },
    };
    const config = variants[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  // Group assessments by status
  const scheduledAssessments = assessments?.filter((a) => a.status === "SCHEDULED") || [];
  const inProgressAssessments = assessments?.filter((a) => a.status === "IN_PROGRESS") || [];
  const completedAssessments = assessments?.filter((a) => a.status === "COMPLETED") || [];
  const overdueAssessments = assessments?.filter((a) => a.status === "OVERDUE") || [];

  return (
    <Box className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Assessments</h1>
          <p className="text-muted-foreground mt-2">
            Schedule and track compliance assessments with scoring
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Assessment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledAssessments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressAssessments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedAssessments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueAssessments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assessments by organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as typeof statusFilter)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assessments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assessments</CardTitle>
          <CardDescription>
            {assessments?.length || 0} assessment{assessments?.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading assessments...</div>
          ) : assessments && assessments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment Date</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Assessor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Next Assessment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>{format(new Date(assessment.assessmentDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{assessment.organizationName || assessment.organizationId}</Badge>
                    </TableCell>
                    <TableCell>
                      {assessment.facilityName ? (
                        <span className="text-sm">{assessment.facilityName}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{assessment.assessorName || assessment.assessorId}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(assessment.status)}</TableCell>
                    <TableCell>
                      {assessment.complianceScore !== undefined ? (
                        <div className="space-y-1">
                          <div className={`font-semibold ${getScoreColor(assessment.complianceScore)}`}>
                            {assessment.complianceScore}%
                          </div>
                          <Progress value={assessment.complianceScore} className="h-1 w-20" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {assessment.nextAssessmentDate ? (
                        <span className="text-sm">{format(new Date(assessment.nextAssessmentDate), "MMM d, yyyy")}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAssessment(assessment);
                            setComplianceScore(assessment.complianceScore?.toString() || "0");
                            setFindings(assessment.findings || "");
                            setNextAssessmentDate(assessment.nextAssessmentDate || "");
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {assessment.status !== "COMPLETED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAssessment(assessment);
                              setAssessmentDate(assessment.assessmentDate);
                              setOrganizationId(assessment.organizationId);
                              setFacilityId(assessment.facilityId || "");
                              setAssessorId(assessment.assessorId);
                              setShowCreateDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No assessments found</p>
              <p className="text-sm text-muted-foreground mt-2">Schedule your first assessment to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            resetForm();
            setSelectedAssessment(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAssessment ? "Edit Assessment" : "Schedule New Assessment"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assessment-date">
                Assessment Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assessment-date"
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">
                Organization <span className="text-destructive">*</span>
              </Label>
              <Select value={organizationId} onValueChange={setOrganizationId} required>
                <SelectTrigger id="organization">
                  <SelectValue placeholder="Select organization..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facility">Facility (Optional)</Label>
              <Input
                id="facility"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                placeholder="Facility ID or leave blank for organization-wide"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessor">
                Assessor ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assessor"
                value={assessorId}
                onChange={(e) => setAssessorId(e.target.value)}
                placeholder="User ID of the assessor"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                  setSelectedAssessment(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAssessment.isPending || updateAssessment.isPending}>
                {createAssessment.isPending || updateAssessment.isPending
                  ? "Saving..."
                  : selectedAssessment
                    ? "Update Assessment"
                    : "Schedule Assessment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assessment Details/Complete Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assessment Details</DialogTitle>
          </DialogHeader>

          {selectedAssessment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Organization</div>
                  <div className="font-medium">{selectedAssessment.organizationName}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Assessment Date</div>
                  <div className="font-medium">
                    {format(new Date(selectedAssessment.assessmentDate), "MMM d, yyyy")}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div>{getStatusBadge(selectedAssessment.status)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Version</div>
                  <div className="font-medium">v{selectedAssessment.version}</div>
                </div>
              </div>

              {selectedAssessment.status !== "COMPLETED" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="score">
                      Compliance Score (0-100) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="score"
                      type="number"
                      min="0"
                      max="100"
                      value={complianceScore}
                      onChange={(e) => setComplianceScore(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="findings">Findings</Label>
                    <Textarea
                      id="findings"
                      value={findings}
                      onChange={(e) => setFindings(e.target.value)}
                      placeholder="Document assessment findings..."
                      rows={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="next-date">Next Assessment Date</Label>
                    <Input
                      id="next-date"
                      type="date"
                      value={nextAssessmentDate}
                      onChange={(e) => setNextAssessmentDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleComplete} disabled={completeAssessment.isPending}>
                      {completeAssessment.isPending ? "Completing..." : "Complete Assessment"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-md">
                    <div className="flex items-center gap-2 text-green-900 dark:text-green-100 font-semibold mb-2">
                      <CheckCircle className="h-5 w-5" />
                      Assessment Completed
                    </div>
                    <div className="text-sm text-green-800 dark:text-green-200">
                      Completed on {selectedAssessment.completedAt ? format(new Date(selectedAssessment.completedAt), "MMM d, yyyy") : "Unknown"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Compliance Score</div>
                    <div className={`text-3xl font-bold ${getScoreColor(selectedAssessment.complianceScore || 0)}`}>
                      {selectedAssessment.complianceScore}%
                    </div>
                    <Progress value={selectedAssessment.complianceScore || 0} className="h-2" />
                  </div>

                  {selectedAssessment.findings && (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Findings</div>
                      <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                        {selectedAssessment.findings}
                      </div>
                    </div>
                  )}

                  {selectedAssessment.nextAssessmentDate && (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Next Assessment</div>
                      <div className="font-medium">
                        {format(new Date(selectedAssessment.nextAssessmentDate), "MMMM d, yyyy")}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

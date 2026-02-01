/**
 * Compliance Gaps Management
 * Track and remediate compliance gaps
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
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Edit, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

export const Route = createFileRoute("/compliance/gaps")({
  component: ComplianceGapsComponent,
});

function ComplianceGapsComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.COMPLIANCE.MANAGE} resource="compliance">
      <ComplianceGapsInner />
    </ProtectedRoute>
  );
}

type GapStatus = "IDENTIFIED" | "IN_REMEDIATION" | "RESOLVED" | "ACCEPTED";
type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface ComplianceGap {
  id: string;
  assessmentId: string;
  ruleId?: string;
  ruleName?: string;
  description: string;
  severity: SeverityLevel;
  status: GapStatus;
  identifiedDate: string;
  targetResolutionDate: string;
  actualResolutionDate?: string;
  remediationPlan?: string;
  responsibleParty?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function ComplianceGapsInner() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<GapStatus | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | "ALL">("ALL");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedGap, setSelectedGap] = useState<ComplianceGap | null>(null);

  // Form state
  const [assessmentId, setAssessmentId] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<SeverityLevel>("MEDIUM");
  const [identifiedDate, setIdentifiedDate] = useState(new Date().toISOString().split("T")[0]);
  const [targetResolutionDate, setTargetResolutionDate] = useState("");
  const [remediationPlan, setRemediationPlan] = useState("");
  const [responsibleParty, setResponsibleParty] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch compliance gaps
  const { data: gaps, isLoading } = useQuery({
    queryKey: ["compliance-gaps", searchQuery, statusFilter, severityFilter],
    queryFn: () =>
      apiClient.get<ComplianceGap[]>("/v1/compliance/gaps", {
        params: {
          search: searchQuery || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          severity: severityFilter !== "ALL" ? severityFilter : undefined,
        },
      }),
  });

  // Create gap mutation
  const createGap = useMutation({
    mutationFn: (data: Partial<ComplianceGap>) =>
      apiClient.post("/v1/compliance/gaps", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-gaps"] });
      toast.success("Compliance gap created successfully");
      resetForm();
      setShowCreateDialog(false);
    },
    onError: () => {
      toast.error("Failed to create compliance gap");
    },
  });

  // Update gap mutation
  const updateGap = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ComplianceGap> }) =>
      apiClient.patch(`/v1/compliance/gaps/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-gaps"] });
      toast.success("Compliance gap updated successfully");
      resetForm();
      setSelectedGap(null);
    },
    onError: () => {
      toast.error("Failed to update compliance gap");
    },
  });

  // Resolve gap mutation
  const resolveGap = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/v1/compliance/gaps/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-gaps"] });
      toast.success("Gap marked as resolved");
    },
    onError: () => {
      toast.error("Failed to resolve gap");
    },
  });

  const resetForm = () => {
    setAssessmentId("");
    setRuleId("");
    setDescription("");
    setSeverity("MEDIUM");
    setIdentifiedDate(new Date().toISOString().split("T")[0]);
    setTargetResolutionDate("");
    setRemediationPlan("");
    setResponsibleParty("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const gapData = {
      assessmentId,
      ruleId: ruleId || undefined,
      description,
      severity,
      identifiedDate,
      targetResolutionDate,
      remediationPlan: remediationPlan || undefined,
      responsibleParty: responsibleParty || undefined,
      notes: notes || undefined,
      status: "IDENTIFIED" as const,
    };

    if (selectedGap) {
      updateGap.mutate({ id: selectedGap.id, data: gapData });
    } else {
      createGap.mutate(gapData);
    }
  };

  const handleEdit = (gap: ComplianceGap) => {
    setSelectedGap(gap);
    setAssessmentId(gap.assessmentId);
    setRuleId(gap.ruleId || "");
    setDescription(gap.description);
    setSeverity(gap.severity);
    setIdentifiedDate(gap.identifiedDate);
    setTargetResolutionDate(gap.targetResolutionDate);
    setRemediationPlan(gap.remediationPlan || "");
    setResponsibleParty(gap.responsibleParty || "");
    setNotes(gap.notes || "");
    setShowCreateDialog(true);
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    const variants = {
      LOW: { variant: "secondary" as const, label: "Low" },
      MEDIUM: { variant: "default" as const, label: "Medium" },
      HIGH: { variant: "destructive" as const, label: "High", className: "bg-orange-600" },
      CRITICAL: { variant: "destructive" as const, label: "Critical" },
    };
    const config = variants[severity];
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: GapStatus) => {
    const variants = {
      IDENTIFIED: { variant: "destructive" as const, label: "Identified", icon: AlertTriangle },
      IN_REMEDIATION: { variant: "default" as const, label: "In Remediation", icon: Clock, className: "bg-blue-600" },
      RESOLVED: { variant: "default" as const, label: "Resolved", icon: CheckCircle, className: "bg-green-600" },
      ACCEPTED: { variant: "secondary" as const, label: "Accepted", icon: XCircle },
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

  const getDaysUntilDue = (targetDate: string) => {
    const days = differenceInDays(new Date(targetDate), new Date());
    if (days < 0) return <span className="text-red-600 font-semibold">{Math.abs(days)} days overdue</span>;
    if (days === 0) return <span className="text-orange-600 font-semibold">Due today</span>;
    if (days <= 7) return <span className="text-orange-600">{days} days remaining</span>;
    return <span className="text-muted-foreground">{days} days remaining</span>;
  };

  // Group gaps by status
  const identifiedGaps = gaps?.filter((g) => g.status === "IDENTIFIED") || [];
  const inRemediationGaps = gaps?.filter((g) => g.status === "IN_REMEDIATION") || [];
  const resolvedGaps = gaps?.filter((g) => g.status === "RESOLVED") || [];
  const criticalGaps = gaps?.filter((g) => g.severity === "CRITICAL" && g.status !== "RESOLVED") || [];

  return (
    <Box className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Gaps</h1>
          <p className="text-muted-foreground mt-2">
            Track and remediate compliance gaps
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Gap
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Identified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{identifiedGaps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Remediation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inRemediationGaps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedGaps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalGaps.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Gaps Alert */}
      {criticalGaps.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Critical Compliance Gaps
            </CardTitle>
            <CardDescription>
              {criticalGaps.length} critical gap{criticalGaps.length > 1 ? "s" : ""} require immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalGaps.map((gap) => (
                <div
                  key={gap.id}
                  className="flex items-center justify-between p-3 bg-destructive/10 rounded-md"
                >
                  <div>
                    <div className="font-medium">{gap.description}</div>
                    <div className="text-sm text-muted-foreground">
                      Due: {format(new Date(gap.targetResolutionDate), "MMM d, yyyy")} - {getDaysUntilDue(gap.targetResolutionDate)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleEdit(gap)}
                  >
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search gaps..."
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
                <SelectItem value="IDENTIFIED">Identified</SelectItem>
                <SelectItem value="IN_REMEDIATION">In Remediation</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={(val) => setSeverityFilter(val as typeof severityFilter)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Severities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Gaps Table */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Gaps</CardTitle>
          <CardDescription>
            {gaps?.length || 0} gap{gaps?.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading gaps...</div>
          ) : gaps && gaps.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Identified</TableHead>
                  <TableHead>Target Resolution</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gaps.map((gap) => (
                  <TableRow key={gap.id}>
                    <TableCell className="max-w-xs">
                      <div className="font-medium">{gap.description}</div>
                      {gap.remediationPlan && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {gap.remediationPlan}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {gap.ruleName ? (
                        <Badge variant="outline">{gap.ruleName}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getSeverityBadge(gap.severity)}</TableCell>
                    <TableCell>{getStatusBadge(gap.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm">{format(new Date(gap.identifiedDate), "MMM d, yyyy")}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{format(new Date(gap.targetResolutionDate), "MMM d, yyyy")}</div>
                        <div className="text-xs">{getDaysUntilDue(gap.targetResolutionDate)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {gap.responsibleParty ? (
                        <span className="text-sm">{gap.responsibleParty}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(gap)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {gap.status !== "RESOLVED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resolveGap.mutate(gap.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
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
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <p className="text-muted-foreground">No compliance gaps found</p>
              <p className="text-sm text-muted-foreground mt-2">All compliance requirements met!</p>
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
            setSelectedGap(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedGap ? "Edit Compliance Gap" : "Create Compliance Gap"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the compliance gap..."
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assessment-id">
                  Assessment ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assessment-id"
                  value={assessmentId}
                  onChange={(e) => setAssessmentId(e.target.value)}
                  placeholder="Assessment that identified this gap"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule-id">Rule ID (Optional)</Label>
                <Input
                  id="rule-id"
                  value={ruleId}
                  onChange={(e) => setRuleId(e.target.value)}
                  placeholder="Related compliance rule"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select value={severity} onValueChange={(val) => setSeverity(val as SeverityLevel)}>
                  <SelectTrigger id="severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible-party">Responsible Party</Label>
                <Input
                  id="responsible-party"
                  value={responsibleParty}
                  onChange={(e) => setResponsibleParty(e.target.value)}
                  placeholder="Person/team responsible for remediation"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="identified-date">
                  Identified Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="identified-date"
                  type="date"
                  value={identifiedDate}
                  onChange={(e) => setIdentifiedDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-resolution-date">
                  Target Resolution Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="target-resolution-date"
                  type="date"
                  value={targetResolutionDate}
                  onChange={(e) => setTargetResolutionDate(e.target.value)}
                  min={identifiedDate}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remediation-plan">Remediation Plan</Label>
              <Textarea
                id="remediation-plan"
                value={remediationPlan}
                onChange={(e) => setRemediationPlan(e.target.value)}
                placeholder="Outline the plan to address this gap..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context or notes..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                  setSelectedGap(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createGap.isPending || updateGap.isPending}>
                {createGap.isPending || updateGap.isPending
                  ? "Saving..."
                  : selectedGap
                    ? "Update Gap"
                    : "Create Gap"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

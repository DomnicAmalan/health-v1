/**
 * Compliance Rules Management
 * Define and manage compliance rules with condition engine
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
import { Plus, Search, Edit, Trash2, Shield, AlertCircle } from "lucide-react";
import { useState } from "react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/compliance/rules")({
  component: ComplianceRulesComponent,
});

function ComplianceRulesComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.COMPLIANCE.MANAGE} resource="compliance">
      <ComplianceRulesInner />
    </ProtectedRoute>
  );
}

interface ComplianceRule {
  id: string;
  code: string;
  name: string;
  description: string;
  regulationId?: string;
  regulationName?: string;
  entityType: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  conditions?: any;
  effectiveDate: string;
  expirationDate?: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

function ComplianceRulesInner() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ComplianceRule | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [regulationId, setRegulationId] = useState("");
  const [entityType, setEntityType] = useState("FACILITY");
  const [priority, setPriority] = useState<ComplianceRule["priority"]>("MEDIUM");
  const [conditionsJson, setConditionsJson] = useState("{}");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [expirationDate, setExpirationDate] = useState("");

  // Fetch compliance rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ["compliance-rules", searchQuery],
    queryFn: () =>
      apiClient.get<ComplianceRule[]>("/v1/compliance/rules", {
        params: { search: searchQuery || undefined },
      }),
  });

  // Fetch regulations for dropdown
  const { data: regulations } = useQuery({
    queryKey: ["regulations"],
    queryFn: () =>
      apiClient.get<Array<{ id: string; name: string; code: string }>>("/v1/compliance/regulations"),
  });

  // Create rule mutation
  const createRule = useMutation({
    mutationFn: (data: Partial<ComplianceRule>) =>
      apiClient.post("/v1/compliance/rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-rules"] });
      toast.success("Compliance rule created successfully");
      resetForm();
      setShowCreateDialog(false);
    },
    onError: () => {
      toast.error("Failed to create compliance rule");
    },
  });

  // Update rule mutation
  const updateRule = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ComplianceRule> }) =>
      apiClient.patch(`/v1/compliance/rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-rules"] });
      toast.success("Compliance rule updated successfully");
      resetForm();
      setSelectedRule(null);
    },
    onError: () => {
      toast.error("Failed to update compliance rule");
    },
  });

  // Delete rule mutation
  const deleteRule = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/compliance/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-rules"] });
      toast.success("Compliance rule deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete compliance rule");
    },
  });

  const resetForm = () => {
    setCode("");
    setName("");
    setDescription("");
    setRegulationId("");
    setEntityType("FACILITY");
    setPriority("MEDIUM");
    setConditionsJson("{}");
    setEffectiveDate(new Date().toISOString().split("T")[0]);
    setExpirationDate("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate JSON
    try {
      JSON.parse(conditionsJson);
    } catch (err) {
      toast.error("Invalid JSON in conditions field");
      return;
    }

    const ruleData = {
      code,
      name,
      description,
      regulationId: regulationId || undefined,
      entityType,
      priority,
      conditions: JSON.parse(conditionsJson),
      effectiveDate,
      expirationDate: expirationDate || undefined,
      status: "ACTIVE" as const,
    };

    if (selectedRule) {
      updateRule.mutate({ id: selectedRule.id, data: ruleData });
    } else {
      createRule.mutate(ruleData);
    }
  };

  const handleEdit = (rule: ComplianceRule) => {
    setSelectedRule(rule);
    setCode(rule.code);
    setName(rule.name);
    setDescription(rule.description);
    setRegulationId(rule.regulationId || "");
    setEntityType(rule.entityType);
    setPriority(rule.priority);
    setConditionsJson(JSON.stringify(rule.conditions || {}, null, 2));
    setEffectiveDate(rule.effectiveDate);
    setExpirationDate(rule.expirationDate || "");
    setShowCreateDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this compliance rule?")) {
      deleteRule.mutate(id);
    }
  };

  const getPriorityBadge = (priority: ComplianceRule["priority"]) => {
    const variants = {
      LOW: { variant: "secondary" as const, label: "Low" },
      MEDIUM: { variant: "default" as const, label: "Medium" },
      HIGH: { variant: "destructive" as const, label: "High" },
      CRITICAL: { variant: "destructive" as const, label: "Critical" },
    };
    const config = variants[priority];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: ComplianceRule["status"]) => {
    const variants = {
      ACTIVE: { variant: "default" as const, label: "Active" },
      DRAFT: { variant: "secondary" as const, label: "Draft" },
      ARCHIVED: { variant: "outline" as const, label: "Archived" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Box className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Rules</h1>
          <p className="text-muted-foreground mt-2">
            Define and manage compliance rules with condition-based logic
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rules by code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Rules</CardTitle>
          <CardDescription>
            {rules?.length || 0} rule{rules?.length !== 1 ? "s" : ""} defined
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading rules...</div>
          ) : rules && rules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Regulation</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.code}</TableCell>
                    <TableCell>{rule.name}</TableCell>
                    <TableCell>
                      {rule.regulationName ? (
                        <Badge variant="outline">{rule.regulationName}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rule.entityType}</Badge>
                    </TableCell>
                    <TableCell>{getPriorityBadge(rule.priority)}</TableCell>
                    <TableCell>{getStatusBadge(rule.status)}</TableCell>
                    <TableCell>{format(new Date(rule.effectiveDate), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No compliance rules found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first rule to get started
              </p>
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
            setSelectedRule(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRule ? "Edit Compliance Rule" : "Create Compliance Rule"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Code & Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Rule Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., HIPAA-001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(val) => setPriority(val as typeof priority)}>
                  <SelectTrigger id="priority">
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
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Rule Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Patient Data Encryption Required"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this rule enforces..."
                rows={3}
              />
            </div>

            {/* Regulation & Entity Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regulation">Linked Regulation</Label>
                <Select value={regulationId} onValueChange={setRegulationId}>
                  <SelectTrigger id="regulation">
                    <SelectValue placeholder="Select regulation..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {regulations?.map((reg) => (
                      <SelectItem key={reg.id} value={reg.id}>
                        {reg.code} - {reg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-type">Entity Type</Label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger id="entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FACILITY">Facility</SelectItem>
                    <SelectItem value="ORGANIZATION">Organization</SelectItem>
                    <SelectItem value="DEPARTMENT">Department</SelectItem>
                    <SelectItem value="PROVIDER">Provider</SelectItem>
                    <SelectItem value="PATIENT">Patient</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effective-date">
                  Effective Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration-date">Expiration Date (Optional)</Label>
                <Input
                  id="expiration-date"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  min={effectiveDate}
                />
              </div>
            </div>

            {/* Conditions (JSON) */}
            <div className="space-y-2">
              <Label htmlFor="conditions">
                Conditions (JSON)
                <span className="text-muted-foreground text-sm ml-2">
                  Define rule logic in JSON format
                </span>
              </Label>
              <Textarea
                id="conditions"
                value={conditionsJson}
                onChange={(e) => setConditionsJson(e.target.value)}
                placeholder='{"field": "value", "operator": "equals"}'
                rows={8}
                className="font-mono text-sm"
              />
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md text-sm">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-blue-900 dark:text-blue-100">
                  <strong>Example:</strong>{" "}
                  {`{"type": "and", "conditions": [{"field": "encryption_enabled", "operator": "equals", "value": true}]}`}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                  setSelectedRule(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRule.isPending || updateRule.isPending}>
                {createRule.isPending || updateRule.isPending
                  ? "Saving..."
                  : selectedRule
                    ? "Update Rule"
                    : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

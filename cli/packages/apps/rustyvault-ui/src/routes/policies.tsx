import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectItem,
  SelectValue,
  Separator,
} from "@lazarus-life/ui-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Edit, FileText, Globe, Loader2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { policiesApi } from "@/lib/api";
import { useRealmStore } from "@/stores/realmStore";

export const Route = createFileRoute("/policies")({
  component: PoliciesPage,
});

// Available capabilities for policies
const CAPABILITIES = ["create", "read", "update", "delete", "list"] as const;
type Capability = (typeof CAPABILITIES)[number];

// Common path templates
const PATH_TEMPLATES = [
  { label: "All Secrets", value: "secret/*" },
  { label: "Secret Data", value: "secret/data/*" },
  { label: "Secret Metadata", value: "secret/metadata/*" },
  { label: "Specific Secret Path", value: "secret/data/" },
  { label: "System Policies", value: "sys/policies/*" },
  { label: "Auth Methods", value: "auth/*" },
  { label: "Custom Path", value: "" },
] as const;

interface PathRule {
  id: string;
  path: string;
  capabilities: Capability[];
}

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

function PoliciesPage() {
  const queryClient = useQueryClient();
  const { currentRealm, isGlobalMode } = useRealmStore();

  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState("");
  const [policyDescription, setPolicyDescription] = useState("");
  const [policyContent, setPolicyContent] = useState("");
  const [pathRules, setPathRules] = useState<PathRule[]>([
    { id: generateId(), path: "secret/data/*", capabilities: ["read", "list"] },
  ]);
  const [useAdvancedMode, setUseAdvancedMode] = useState(false);

  // Reset selection when realm changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally want to reset when realm changes
  useEffect(() => {
    setSelectedPolicy(null);
    setIsCreating(false);
    setPolicyContent("");
  }, [currentRealm?.id, isGlobalMode]);

  // Fetch policies list (realm-scoped or global)
  const {
    data: policiesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["policies", currentRealm?.id, isGlobalMode],
    queryFn: () =>
      currentRealm && !isGlobalMode
        ? policiesApi.listForRealm(currentRealm.id)
        : policiesApi.list(),
  });

  // Fetch selected policy details
  const { data: policyDetails } = useQuery({
    queryKey: ["policy", selectedPolicy, currentRealm?.id, isGlobalMode],
    queryFn: () => {
      if (!selectedPolicy) {
        throw new Error("Policy not selected");
      }
      return currentRealm && !isGlobalMode
        ? policiesApi.readForRealm(currentRealm.id, selectedPolicy)
        : policiesApi.read(selectedPolicy);
    },
    enabled: !!selectedPolicy,
  });

  // Create/update policy mutation
  const savePolicyMutation = useMutation({
    mutationFn: ({ name, policy }: { name: string; policy: string }) =>
      currentRealm && !isGlobalMode
        ? policiesApi.writeForRealm(currentRealm.id, name, policy)
        : policiesApi.write(name, policy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies", currentRealm?.id, isGlobalMode] });
      queryClient.invalidateQueries({
        queryKey: ["policy", selectedPolicy, currentRealm?.id, isGlobalMode],
      });
      setIsCreating(false);
      setNewPolicyName("");
      setPolicyContent("");
    },
  });

  // Delete policy mutation
  const deletePolicyMutation = useMutation({
    mutationFn: (name: string) =>
      currentRealm && !isGlobalMode
        ? policiesApi.deleteForRealm(currentRealm.id, name)
        : policiesApi.delete(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies", currentRealm?.id, isGlobalMode] });
      setSelectedPolicy(null);
    },
  });

  // Convert path rules to policy JSON
  const pathRulesToJson = (rules: PathRule[]): string => {
    const pathObj: Record<string, { capabilities: string[] }> = {};
    for (const rule of rules) {
      if (rule.path && rule.capabilities.length > 0) {
        pathObj[rule.path] = { capabilities: rule.capabilities };
      }
    }
    return JSON.stringify(
      {
        name: newPolicyName || "new-policy",
        path: pathObj,
      },
      null,
      2,
    );
  };

  // Add a new path rule
  const addPathRule = () => {
    setPathRules([...pathRules, { id: generateId(), path: "", capabilities: ["read"] }]);
  };

  // Remove a path rule
  const removePathRule = (id: string) => {
    if (pathRules.length > 1) {
      setPathRules(pathRules.filter((rule) => rule.id !== id));
    }
  };

  // Update path for a rule
  const updateRulePath = (id: string, path: string) => {
    setPathRules(pathRules.map((rule) => (rule.id === id ? { ...rule, path } : rule)));
  };

  // Toggle capability for a rule
  const toggleCapability = (id: string, capability: Capability) => {
    setPathRules(
      pathRules.map((rule) => {
        if (rule.id !== id) return rule;
        const hasCapability = rule.capabilities.includes(capability);
        return {
          ...rule,
          capabilities: hasCapability
            ? rule.capabilities.filter((c) => c !== capability)
            : [...rule.capabilities, capability],
        };
      }),
    );
  };

  const handleCreatePolicy = () => {
    if (!newPolicyName) return;

    const policyJson = useAdvancedMode ? policyContent : pathRulesToJson(pathRules);
    if (policyJson) {
      savePolicyMutation.mutate({ name: newPolicyName, policy: policyJson });
    }
  };

  const handleUpdatePolicy = () => {
    if (selectedPolicy && policyContent) {
      savePolicyMutation.mutate({ name: selectedPolicy, policy: policyContent });
    }
  };

  const policies = policiesData?.keys || [];

  // Default policy template for advanced mode
  const defaultPolicyTemplate = `{
  "name": "example-policy",
  "path": {
    "secret/*": {
      "capabilities": ["read", "list"]
    },
    "secret/data/*": {
      "capabilities": ["create", "read", "update", "delete", "list"]
    }
  }
}`;

  // Reset form state when starting to create
  const startCreating = () => {
    setIsCreating(true);
    setSelectedPolicy(null);
    setNewPolicyName("");
    setPathRules([{ id: generateId(), path: "secret/data/*", capabilities: ["read", "list"] }]);
    setPolicyContent(defaultPolicyTemplate);
    setUseAdvancedMode(false);
  };

  // Context indicator
  const contextLabel = currentRealm && !isGlobalMode ? `Realm: ${currentRealm.name}` : "Global";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Policies</h1>
            <Badge variant={isGlobalMode ? "default" : "secondary"}>
              <Globe className="h-3 w-3 mr-1" />
              {contextLabel}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Manage access control policies for Lazarus Life Vault
          </p>
        </div>
        <Button onClick={startCreating}>
          <Plus className="h-4 w-4 mr-2" />
          New Policy
        </Button>
      </div>

      {/* No Realm Selected Info */}
      {isGlobalMode && (
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription>
            You are viewing global policies. For realm-scoped policies,{" "}
            <Link to="/realms" className="underline font-medium">
              select a realm
            </Link>{" "}
            from the sidebar.
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load policies"}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policies List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">ACL Policies</CardTitle>
            <CardDescription>
              {policies.length} {policies.length === 1 ? "policy" : "policies"}
              {currentRealm && !isGlobalMode && (
                <span className="block text-xs mt-1">Realm: {currentRealm.name}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : policies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No policies found</p>
                <p className="text-xs mt-1">Create your first policy</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {policies.map((policy) => (
                  <button
                    key={policy}
                    type="button"
                    className={`w-full flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors text-left ${
                      selectedPolicy === policy ? "bg-primary/10 border-primary" : "hover:bg-accent"
                    }`}
                    onClick={() => {
                      setSelectedPolicy(policy);
                      setIsCreating(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPolicy(policy);
                        setIsCreating(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{policy}</span>
                    </div>
                    {(policy === "root" || policy === "default") && (
                      <Badge variant="secondary">System</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Policy Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {isCreating
                ? "Create New Policy"
                : selectedPolicy
                  ? `Policy: ${selectedPolicy}`
                  : "Select a Policy"}
            </CardTitle>
            <CardDescription>
              {isCreating
                ? "Define a new access control policy"
                : selectedPolicy
                  ? "View and edit policy details"
                  : "Select a policy from the list to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCreating ? (
              <div className="space-y-6">
                {/* Policy Basic Info */}
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">Basic Information</div>
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="policy-name">Policy Name *</Label>
                    <Input
                      id="policy-name"
                      value={newPolicyName}
                      onChange={(e) => setNewPolicyName(e.target.value)}
                      placeholder="my-policy"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="policy-description">Description</Label>
                    <Input
                      id="policy-description"
                      value={policyDescription}
                      onChange={(e) => setPolicyDescription(e.target.value)}
                      placeholder="Describe what this policy is used for..."
                    />
                  </div>
                </div>

                {/* Mode Toggle */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-muted-foreground">Policy Definition</div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={useAdvancedMode ? "outline" : "default"}
                        size="sm"
                        onClick={() => setUseAdvancedMode(false)}
                      >
                        Visual Builder
                      </Button>
                      <Button
                        variant={useAdvancedMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setUseAdvancedMode(true);
                          setPolicyContent(pathRulesToJson(pathRules));
                        }}
                      >
                        Advanced (JSON)
                      </Button>
                    </div>
                  </div>
                  <Separator />
                </div>

                {useAdvancedMode ? (
                  /* Advanced JSON Mode */
                  <div>
                    <Label htmlFor="policy-content">Policy Content (JSON)</Label>
                    <textarea
                      id="policy-content"
                      value={policyContent}
                      onChange={(e) => setPolicyContent(e.target.value)}
                      className="w-full h-64 p-3 font-mono text-sm border rounded-md bg-background resize-y"
                      placeholder="Enter policy JSON..."
                    />
                  </div>
                ) : (
                  /* Visual Builder Mode */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Path Rules</Label>
                      <Button variant="outline" size="sm" onClick={addPathRule}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Path
                      </Button>
                    </div>

                    {pathRules.map((rule, index) => (
                      <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Rule {index + 1}
                          </span>
                          {pathRules.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removePathRule(rule.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Path Selection */}
                        <div className="space-y-2">
                          <Label>Path Pattern</Label>
                          <div className="flex gap-2">
                            <Select
                              value={PATH_TEMPLATES.find((t) => t.value === rule.path)?.value || ""}
                              onValueChange={(value) => {
                                if (value && value !== "custom") updateRulePath(rule.id, value);
                              }}
                              className="w-48"
                            >
                              <SelectValue placeholder="Select template" />
                              {PATH_TEMPLATES.map((template) => (
                                <SelectItem key={template.value} value={template.value || "custom"}>
                                  {template.label}
                                </SelectItem>
                              ))}
                            </Select>
                            <Input
                              value={rule.path}
                              onChange={(e) => updateRulePath(rule.id, e.target.value)}
                              placeholder="secret/data/my-app/*"
                              className="flex-1"
                            />
                          </div>
                        </div>

                        {/* Capabilities */}
                        <div className="space-y-2">
                          <Label>Capabilities</Label>
                          <div className="flex flex-wrap gap-3">
                            {CAPABILITIES.map((capability) => (
                              <div key={capability} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${rule.id}-${capability}`}
                                  checked={rule.capabilities.includes(capability)}
                                  onCheckedChange={() => toggleCapability(rule.id, capability)}
                                />
                                <label
                                  htmlFor={`${rule.id}-${capability}`}
                                  className="text-sm capitalize cursor-pointer"
                                >
                                  {capability}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Preview */}
                    <div className="border-t pt-4">
                      <Label className="text-muted-foreground">Preview (JSON)</Label>
                      <pre className="mt-2 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto max-h-32">
                        {pathRulesToJson(pathRules)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreatePolicy}
                    disabled={
                      savePolicyMutation.isPending ||
                      !newPolicyName ||
                      (!useAdvancedMode &&
                        pathRules.every((r) => !r.path || r.capabilities.length === 0))
                    }
                  >
                    {savePolicyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Policy"
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : selectedPolicy ? (
              <div className="space-y-4">
                <div>
                  <Label>Policy Content</Label>
                  <textarea
                    value={policyDetails?.policy || policyContent}
                    onChange={(e) => setPolicyContent(e.target.value)}
                    className="w-full h-64 p-3 font-mono text-sm border rounded-md bg-background resize-y"
                    readOnly={selectedPolicy === "root" || selectedPolicy === "default"}
                  />
                </div>
                {selectedPolicy !== "root" && selectedPolicy !== "default" && (
                  <div className="flex gap-2">
                    <Button onClick={handleUpdatePolicy} disabled={savePolicyMutation.isPending}>
                      <Edit className="h-4 w-4 mr-2" />
                      {savePolicyMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deletePolicyMutation.mutate(selectedPolicy)}
                      disabled={deletePolicyMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deletePolicyMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a policy from the list to view and edit</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

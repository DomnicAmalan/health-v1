import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectItem,
  Switch,
} from "@lazarus-life/ui-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AppWindow,
  Check,
  ChevronLeft,
  ChevronRight,
  Key,
  Loader2,
  Shield,
  User,
} from "lucide-react";
import { useState } from "react";
import {
  type AppAccessRequest,
  type ProvisionUserRequest,
  provisioningApi,
} from "@/lib/api/provisioning";

// Common apps - these should ideally come from an API
const AVAILABLE_APPS = [
  { name: "admin-ui", label: "Admin Dashboard", description: "Administrative access" },
  { name: "client-app", label: "Client Application", description: "Main user application" },
  { name: "mobile", label: "Mobile App", description: "Mobile application access" },
];

// Common roles
const AVAILABLE_ROLES = ["admin", "user", "manager", "viewer"];

// Common policies
const AVAILABLE_POLICIES = ["default", "admin", "reader", "writer"];

type Step = "basic" | "role" | "apps" | "vault" | "review";

const STEPS: Step[] = ["basic", "role", "apps", "vault", "review"];

interface ProvisionUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export function ProvisionUserDialog({
  open,
  onOpenChange,
  organizations,
  onSuccess,
}: ProvisionUserDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("basic");

  const [formData, setFormData] = useState<ProvisionUserRequest>({
    email: "",
    password: "",
    display_name: "",
    organization_id: "",
    role_name: "",
    group_names: [],
    app_access: [],
    vault_access: {
      create_user: false,
      policies: [],
      create_token: false,
    },
  });

  const [selectedApps, setSelectedApps] = useState<Record<string, AppAccessRequest>>({});
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);

  const provisionMutation = useMutation({
    mutationFn: provisioningApi.provisionUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
  });

  const resetForm = () => {
    setStep("basic");
    setFormData({
      email: "",
      password: "",
      display_name: "",
      organization_id: "",
      role_name: "",
      group_names: [],
      app_access: [],
      vault_access: {
        create_user: false,
        policies: [],
        create_token: false,
      },
    });
    setSelectedApps({});
    setSelectedPolicies([]);
  };

  const currentStepIndex = STEPS.indexOf(step);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const handleNext = () => {
    const nextStep = STEPS[currentStepIndex + 1];
    if (!isLastStep && nextStep) {
      setStep(nextStep);
    }
  };

  const handleBack = () => {
    const prevStep = STEPS[currentStepIndex - 1];
    if (!isFirstStep && prevStep) {
      setStep(prevStep);
    }
  };

  const handleSubmit = () => {
    const appAccess = Object.values(selectedApps);
    // Include realm_id based on organization - the backend will use org's realm
    // If no specific realm_id is set, the backend will look up/create the realm for the org
    const vaultAccess =
      formData.vault_access?.create_user || formData.vault_access?.create_token
        ? {
            ...formData.vault_access,
            policies: selectedPolicies,
            // realm_id is derived from organization_id by the backend
            // We could optionally allow realm selection here if needed
          }
        : undefined;

    provisionMutation.mutate({
      ...formData,
      app_access: appAccess,
      vault_access: vaultAccess,
    });
  };

  const toggleAppAccess = (appName: string, accessLevel: "read" | "write" | "admin") => {
    setSelectedApps((prev) => {
      if (prev[appName]) {
        const { [appName]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [appName]: { app_name: appName, access_level: accessLevel } };
    });
  };

  const updateAppAccessLevel = (appName: string, accessLevel: "read" | "write" | "admin") => {
    setSelectedApps((prev) => ({
      ...prev,
      [appName]: { app_name: appName, access_level: accessLevel },
    }));
  };

  const togglePolicy = (policy: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(policy) ? prev.filter((p) => p !== policy) : [...prev, policy]
    );
  };

  const canProceed = () => {
    switch (step) {
      case "basic":
        return (
          formData.email && formData.password && formData.display_name && formData.organization_id
        );
      case "role":
        return true; // Role is optional
      case "apps":
        return true; // Apps are optional
      case "vault":
        return true; // Vault is optional
      case "review":
        return true;
      default:
        return false;
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i <= currentStepIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderBasicStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5 text-primary" />
        <h3 className="font-medium">Basic Information</h3>
      </div>
      <Input
        label="Email Address"
        id="email"
        type="email"
        value={formData.email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData({ ...formData, email: e.target.value })
        }
        placeholder="user@example.com"
      />
      <Input
        label="Display Name"
        id="display_name"
        value={formData.display_name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData({ ...formData, display_name: e.target.value })
        }
        placeholder="John Doe"
      />
      <Input
        label="Password"
        id="password"
        type="password"
        value={formData.password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData({ ...formData, password: e.target.value })
        }
        placeholder="••••••••"
      />
      <div className="space-y-2">
        <Label htmlFor="organization">Organization</Label>
        <Select
          id="organization"
          value={formData.organization_id}
          onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
        >
          <SelectItem value="" disabled={true}>
            Select organization
          </SelectItem>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );

  const renderRoleStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-medium">Role Assignment</h3>
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">System Role</Label>
        <Select
          id="role"
          value={formData.role_name || ""}
          onValueChange={(value) => setFormData({ ...formData, role_name: value })}
        >
          <SelectItem value="">No role</SelectItem>
          {AVAILABLE_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </SelectItem>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          Roles define system-wide permissions for the user
        </p>
      </div>
    </div>
  );

  const renderAppsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AppWindow className="h-5 w-5 text-primary" />
        <h3 className="font-medium">Application Access</h3>
      </div>
      <div className="space-y-3">
        {AVAILABLE_APPS.map((app) => {
          const isSelected = !!selectedApps[app.name];
          return (
            <div
              key={app.name}
              className={`p-4 border rounded-lg transition-colors ${
                isSelected ? "border-primary bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleAppAccess(app.name, "read")}
                  />
                  <div>
                    <p className="font-medium">{app.label}</p>
                    <p className="text-xs text-muted-foreground">{app.description}</p>
                  </div>
                </div>
                {isSelected && (
                  <Select
                    className="w-24"
                    value={selectedApps[app.name]?.access_level || "read"}
                    onValueChange={(value) =>
                      updateAppAccessLevel(app.name, value as "read" | "write" | "admin")
                    }
                  >
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="write">Write</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </Select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderVaultStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Key className="h-5 w-5 text-primary" />
        <h3 className="font-medium">Vault Access</h3>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Create Vault User</p>
            <p className="text-xs text-muted-foreground">
              Create a userpass user in the vault for this user
            </p>
          </div>
          <Switch
            checked={formData.vault_access?.create_user}
            onCheckedChange={(checked) =>
              setFormData({
                ...formData,
                vault_access: { ...formData.vault_access, create_user: checked },
              })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Generate Vault Token</p>
            <p className="text-xs text-muted-foreground">
              Create an initial access token for the user
            </p>
          </div>
          <Switch
            checked={formData.vault_access?.create_token}
            onCheckedChange={(checked) =>
              setFormData({
                ...formData,
                vault_access: { ...formData.vault_access, create_token: checked },
              })
            }
          />
        </div>

        {(formData.vault_access?.create_user || formData.vault_access?.create_token) && (
          <div className="space-y-2 pt-2">
            <Label>Vault Policies</Label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_POLICIES.map((policy) => (
                <div key={policy} className="flex items-center space-x-2">
                  <Checkbox
                    id={`policy-${policy}`}
                    checked={selectedPolicies.includes(policy)}
                    onCheckedChange={() => togglePolicy(policy)}
                  />
                  <label htmlFor={`policy-${policy}`} className="text-sm">
                    {policy}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const selectedOrg = organizations.find((o) => o.id === formData.organization_id);
    return (
      <div className="space-y-4">
        <h3 className="font-medium mb-4">Review & Confirm</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{formData.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Display Name</span>
            <span className="font-medium">{formData.display_name}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Organization</span>
            <span className="font-medium">{selectedOrg?.name || "-"}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">{formData.role_name || "None"}</span>
          </div>
          <div className="py-2 border-b">
            <span className="text-muted-foreground">App Access</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.values(selectedApps).length > 0 ? (
                Object.values(selectedApps).map((app) => (
                  <Badge key={app.app_name} variant="secondary">
                    {app.app_name} ({app.access_level})
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          </div>
          <div className="py-2">
            <span className="text-muted-foreground">Vault Access</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {formData.vault_access?.create_user && <Badge variant="secondary">User</Badge>}
              {formData.vault_access?.create_token && <Badge variant="secondary">Token</Badge>}
              {selectedPolicies.map((p) => (
                <Badge key={p} variant="outline">
                  {p}
                </Badge>
              ))}
              {!(formData.vault_access?.create_user || formData.vault_access?.create_token) && (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case "basic":
        return renderBasicStep();
      case "role":
        return renderRoleStep();
      case "apps":
        return renderAppsStep();
      case "vault":
        return renderVaultStep();
      case "review":
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provision New User</DialogTitle>
          <DialogDescription>Create a new user with complete access setup</DialogDescription>
        </DialogHeader>

        {provisionMutation.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {provisionMutation.error instanceof Error
                ? provisionMutation.error.message
                : "Failed to provision user"}
            </AlertDescription>
          </Alert>
        )}

        {renderStepIndicator()}
        {renderStep()}

        <DialogFooter className="gap-2">
          {!isFirstStep && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={provisionMutation.isPending}>
              {provisionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Provisioning...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Provision User
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

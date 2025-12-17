import { useTranslation } from "@lazarus-life/shared/i18n";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Switch,
} from "@lazarus-life/ui-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Check,
  Copy,
  Globe,
  Key,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { SecretIdDialog } from "@/components/SecretIdDialog";
import {
  approleApi,
  type CreateAppRoleRequest,
  formatTTL,
  type SecretIdResponse,
} from "@/lib/api/approle";
import { useRealmStore } from "@/stores/realmStore";

// Common policies
const COMMON_POLICIES = ["default", "admin", "reader", "writer"];

export function AppRolesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentRealm, isGlobalMode } = useRealmStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [secretIdData, setSecretIdData] = useState<SecretIdResponse | null>(null);
  const [isSecretDialogOpen, setIsSecretDialogOpen] = useState(false);
  const [copiedRoleId, setCopiedRoleId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{ roleName: string } & CreateAppRoleRequest>({
    roleName: "",
    bind_secret_id: true,
    secret_id_ttl: 3600,
    secret_id_num_uses: 1,
    token_ttl: 3600,
    token_max_ttl: 86400,
    policies: ["default"],
  });

  // Fetch roles
  const {
    data: roleNames = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["approles", currentRealm?.id],
    queryFn: () => approleApi.listRoles(currentRealm?.id),
    enabled: !!currentRealm && !isGlobalMode,
  });

  // Fetch role details for each role
  const rolesWithDetails = useQuery({
    queryKey: ["approles-details", currentRealm?.id, roleNames],
    queryFn: async () => {
      if (!currentRealm || roleNames.length === 0) return [];
      const details = await Promise.all(
        roleNames.map(async (name) => {
          try {
            const role = await approleApi.getRole(currentRealm.id, name);
            const roleId = await approleApi.getRoleId(currentRealm.id, name);
            return { ...role, role_name: name, role_id: roleId };
          } catch {
            // Return a minimal object with required fields when fetch fails
            return {
              role_name: name,
              role_id: "",
              policies: [] as string[],
              bind_secret_id: true,
              token_ttl: undefined as number | undefined,
              secret_id_num_uses: undefined as number | undefined,
            };
          }
        }),
      );
      return details;
    },
    enabled: !!currentRealm && roleNames.length > 0,
  });

  // Create role mutation
  const createMutation = useMutation({
    mutationFn: async (data: { roleName: string } & CreateAppRoleRequest) => {
      const { roleName, ...request } = data;
      await approleApi.createRole(currentRealm?.id, roleName, request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approles", currentRealm?.id] });
      queryClient.invalidateQueries({ queryKey: ["approles-details", currentRealm?.id] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: (roleName: string) => approleApi.deleteRole(currentRealm?.id, roleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approles", currentRealm?.id] });
      queryClient.invalidateQueries({ queryKey: ["approles-details", currentRealm?.id] });
      setIsDeleteOpen(false);
      setSelectedRole(null);
    },
  });

  // Generate secret ID mutation
  const generateSecretMutation = useMutation({
    mutationFn: (roleName: string) => approleApi.generateSecretId(currentRealm?.id, roleName),
    onSuccess: (data, roleName) => {
      setSecretIdData(data);
      setSelectedRole(roleName);
      setIsSecretDialogOpen(true);
    },
  });

  const resetForm = () => {
    setFormData({
      roleName: "",
      bind_secret_id: true,
      secret_id_ttl: 3600,
      secret_id_num_uses: 1,
      token_ttl: 3600,
      token_max_ttl: 86400,
      policies: ["default"],
    });
  };

  const handlePolicyToggle = (policy: string) => {
    const current = formData.policies || [];
    const updated = current.includes(policy)
      ? current.filter((p) => p !== policy)
      : [...current, policy];
    setFormData({ ...formData, policies: updated });
  };

  const handleCreate = () => {
    if (formData.roleName) {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (selectedRole) {
      deleteMutation.mutate(selectedRole);
    }
  };

  const handleCopyRoleId = async (roleId: string, roleName: string) => {
    try {
      await navigator.clipboard.writeText(roleId);
      setCopiedRoleId(roleName);
      setTimeout(() => setCopiedRoleId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const openDeleteDialog = (roleName: string) => {
    setSelectedRole(roleName);
    setIsDeleteOpen(true);
  };

  // No realm selected state
  if (!currentRealm || isGlobalMode) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("approles.noRealmSelected.title")}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t("approles.noRealmSelected.description")}
            </p>
            <Link to="/realms">
              <Button>{t("approles.noRealmSelected.goToRealms")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roles = rolesWithDetails.data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("approles.title")}</h1>
          <p className="text-muted-foreground">
            {t("approles.subtitle", { realmName: currentRealm.name })}
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("approles.create.button")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("approles.create.dialogTitle")}</DialogTitle>
              <DialogDescription>{t("approles.create.dialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="roleName">{t("approles.create.fields.roleName")}</Label>
                <Input
                  id="roleName"
                  placeholder={t("approles.create.fields.roleNamePlaceholder")}
                  value={formData.roleName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, roleName: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("approles.create.fields.bindSecretId")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("approles.create.fields.bindSecretIdDescription")}
                  </p>
                </div>
                <Switch
                  checked={formData.bind_secret_id}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, bind_secret_id: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="secret_ttl">{t("approles.create.fields.secretIdTtl")}</Label>
                  <Input
                    id="secret_ttl"
                    type="number"
                    value={formData.secret_id_ttl || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({
                        ...formData,
                        secret_id_ttl: parseInt(e.target.value, 10) || undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secret_uses">{t("approles.create.fields.secretIdMaxUses")}</Label>
                  <Input
                    id="secret_uses"
                    type="number"
                    value={formData.secret_id_num_uses || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({
                        ...formData,
                        secret_id_num_uses: parseInt(e.target.value, 10) || undefined,
                      })
                    }
                    placeholder={t("approles.create.fields.secretIdMaxUsesPlaceholder")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="token_ttl">{t("approles.create.fields.tokenTtl")}</Label>
                  <Input
                    id="token_ttl"
                    type="number"
                    value={formData.token_ttl || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({
                        ...formData,
                        token_ttl: parseInt(e.target.value, 10) || undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token_max_ttl">{t("approles.create.fields.tokenMaxTtl")}</Label>
                  <Input
                    id="token_max_ttl"
                    type="number"
                    value={formData.token_max_ttl || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({
                        ...formData,
                        token_max_ttl: parseInt(e.target.value, 10) || undefined,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("approles.create.fields.policies")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_POLICIES.map((policy) => (
                    <div key={policy} className="flex items-center space-x-2">
                      <Checkbox
                        id={`policy-${policy}`}
                        checked={formData.policies?.includes(policy)}
                        onCheckedChange={() => handlePolicyToggle(policy)}
                      />
                      <label htmlFor={`policy-${policy}`} className="text-sm">
                        {policy}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t("approles.create.actions.cancel")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.roleName || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("approles.create.creating")}
                  </>
                ) : (
                  t("approles.create.createRole")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : t("approles.errors.failedToLoad")}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && roles.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <KeyRound className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("approles.empty.title")}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t("approles.empty.description")}
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("approles.create.button")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Roles Grid */}
      {!isLoading && roles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.role_name} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{role.role_name}</CardTitle>
                  </div>
                  {role.bind_secret_id !== false ? (
                    <Badge variant="secondary">{t("approles.list.secretRequired")}</Badge>
                  ) : (
                    <Badge variant="outline">{t("approles.list.noSecret")}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Role ID */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("approles.list.roleId")}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded truncate flex-1">
                        {role.role_id || t("approles.list.loading")}
                      </code>
                      {role.role_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyRoleId(role.role_id, role.role_name)}
                        >
                          {copiedRoleId === role.role_name ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* TTL Info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("approles.list.tokenTtl")}</p>
                      <p>{formatTTL(role.token_ttl)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("approles.list.secretUses")}
                      </p>
                      <p>
                        {role.secret_id_num_uses === 0
                          ? t("approles.list.unlimited")
                          : role.secret_id_num_uses || 1}
                      </p>
                    </div>
                  </div>

                  {/* Policies */}
                  {role.policies && role.policies.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("approles.list.policies")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {role.policies.map((policy) => (
                          <Badge key={policy} variant="outline" className="text-xs">
                            {policy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateSecretMutation.mutate(role.role_name)}
                    disabled={generateSecretMutation.isPending}
                  >
                    {generateSecretMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Key className="h-4 w-4 mr-1" />
                    )}
                    {t("approles.list.generateSecret")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(role.role_name)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t("approles.list.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Secret ID Dialog */}
      <SecretIdDialog
        open={isSecretDialogOpen}
        onOpenChange={setIsSecretDialogOpen}
        secretIdData={secretIdData}
        roleName={selectedRole || ""}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("approles.delete.title")}</DialogTitle>
            <DialogDescription>
              {t("approles.delete.dialogDescription", { roleName: selectedRole || "" })}
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("approles.delete.warning")}</AlertDescription>
          </Alert>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              {t("approles.create.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("approles.delete.deleting")}
                </>
              ) : (
                t("approles.delete.deleteRole")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useTranslation } from "@lazarus-life/shared/i18n";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectItem,
} from "@lazarus-life/ui-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertCircle, AppWindow, Edit, Globe, Loader2, Plus, Trash2, Wand2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
  type AppType,
  type AuthMethod,
  appsApi,
  type CreateAppRequest,
  defaultAuthMethods,
  getAppTypeIcon,
  getAppTypeLabel,
  type RealmApplication,
} from "@/lib/api/apps";
import { useRealmStore } from "@/stores/realmStore";

const APP_TYPES: AppType[] = ["admin-ui", "client-app", "mobile", "api"];
const AUTH_METHODS: AuthMethod[] = ["token", "userpass", "approle", "jwt"];

export function ApplicationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentRealm, isGlobalMode } = useRealmStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<RealmApplication | null>(null);
  const [formData, setFormData] = useState<CreateAppRequest>({
    app_name: "",
    app_type: "client-app",
    display_name: "",
    description: "",
    allowed_auth_methods: ["token", "userpass"],
  });

  // Fetch apps for current realm
  const {
    data: apps = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["realm-apps", currentRealm?.id],
    queryFn: () => {
      if (!currentRealm?.id) throw new Error("No realm selected");
      return appsApi.list(currentRealm.id);
    },
    enabled: !!currentRealm && !isGlobalMode,
  });

  // Create app mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateAppRequest) => {
      if (!currentRealm?.id) throw new Error("No realm selected");
      return appsApi.create(currentRealm.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["realm-apps", currentRealm?.id] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  // Update app mutation
  const updateMutation = useMutation({
    mutationFn: ({ appName, data }: { appName: string; data: Partial<CreateAppRequest> }) => {
      if (!currentRealm?.id) throw new Error("No realm selected");
      return appsApi.update(currentRealm.id, appName, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["realm-apps", currentRealm?.id] });
      setIsEditOpen(false);
      setSelectedApp(null);
      resetForm();
    },
  });

  // Delete app mutation
  const deleteMutation = useMutation({
    mutationFn: (appName: string) => {
      if (!currentRealm?.id) throw new Error("No realm selected");
      return appsApi.delete(currentRealm.id, appName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["realm-apps", currentRealm?.id] });
      setIsDeleteOpen(false);
      setSelectedApp(null);
    },
  });

  // Register defaults mutation
  const registerDefaultsMutation = useMutation({
    mutationFn: () => {
      if (!currentRealm?.id) throw new Error("No realm selected");
      return appsApi.registerDefaults(currentRealm.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["realm-apps", currentRealm?.id] });
    },
  });

  const resetForm = () => {
    setFormData({
      app_name: "",
      app_type: "client-app",
      display_name: "",
      description: "",
      allowed_auth_methods: ["token", "userpass"],
    });
  };

  const handleAppTypeChange = (appType: AppType) => {
    setFormData({
      ...formData,
      app_type: appType,
      allowed_auth_methods: defaultAuthMethods[appType],
    });
  };

  const handleAuthMethodToggle = (method: AuthMethod) => {
    const current = formData.allowed_auth_methods || [];
    const updated = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method];
    setFormData({ ...formData, allowed_auth_methods: updated });
  };

  const handleCreate = () => {
    if (formData.app_name && formData.app_type) {
      createMutation.mutate(formData);
    }
  };

  const handleUpdate = () => {
    if (selectedApp) {
      // Build update data, only including defined properties
      const updateData: Partial<CreateAppRequest> = {};
      if (formData.display_name) {
        updateData.display_name = formData.display_name;
      }
      if (formData.description) {
        updateData.description = formData.description;
      }
      if (formData.allowed_auth_methods) {
        updateData.allowed_auth_methods = formData.allowed_auth_methods;
      }
      updateMutation.mutate({
        appName: selectedApp.app_name,
        data: updateData,
      });
    }
  };

  const handleDelete = () => {
    if (selectedApp) {
      deleteMutation.mutate(selectedApp.app_name);
    }
  };

  const openEditDialog = (app: RealmApplication) => {
    setSelectedApp(app);
    setFormData({
      app_name: app.app_name,
      app_type: app.app_type,
      display_name: app.display_name || "",
      description: app.description || "",
      allowed_auth_methods: app.allowed_auth_methods,
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (app: RealmApplication) => {
    setSelectedApp(app);
    setIsDeleteOpen(true);
  };

  // No realm selected state
  if (!currentRealm || isGlobalMode) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("applications.noRealmSelected.title")}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t("applications.noRealmSelected.description")}
            </p>
            <Link to="/realms">
              <Button>{t("applications.noRealmSelected.goToRealms")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("applications.title")}</h1>
          <p className="text-muted-foreground">
            {t("applications.subtitle", { realmName: currentRealm.name })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => registerDefaultsMutation.mutate()}
            disabled={registerDefaultsMutation.isPending}
          >
            {registerDefaultsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            {t("applications.create.registerDefaults")}
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("applications.create.registerApp")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("applications.create.dialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("applications.create.dialogDescription", { realmName: currentRealm.name })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="app_name">{t("applications.create.fields.appName")}</Label>
                  <Input
                    id="app_name"
                    placeholder={t("applications.create.fields.appNamePlaceholder")}
                    value={formData.app_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, app_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app_type">{t("applications.create.fields.appType")}</Label>
                  <Select
                    id="app_type"
                    value={formData.app_type}
                    onValueChange={(value) => handleAppTypeChange(value as AppType)}
                  >
                    <SelectItem value="" disabled>
                      {t("applications.create.fields.appTypePlaceholder")}
                    </SelectItem>
                    {APP_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {getAppTypeIcon(type)} {getAppTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">
                    {t("applications.create.fields.displayName")}
                  </Label>
                  <Input
                    id="display_name"
                    placeholder={t("applications.create.fields.displayNamePlaceholder")}
                    value={formData.display_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, display_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t("applications.create.fields.description")}</Label>
                  <Input
                    id="description"
                    placeholder={t("applications.create.fields.descriptionPlaceholder")}
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("applications.create.fields.allowedAuthMethods")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AUTH_METHODS.map((method) => (
                      <div key={method} className="flex items-center space-x-2">
                        <Checkbox
                          id={`auth-${method}`}
                          checked={formData.allowed_auth_methods?.includes(method) ?? false}
                          onCheckedChange={() => handleAuthMethodToggle(method)}
                        />
                        <label htmlFor={`auth-${method}`} className="text-sm">
                          {t(`applications.authMethods.${method}`) || method}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t("applications.create.actions.cancel")}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formData.app_name || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("applications.create.registering")}
                    </>
                  ) : (
                    t("applications.create.actions.register")
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : t("applications.errors.failedToLoad")}
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
      {!isLoading && apps.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AppWindow className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("applications.empty.title")}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t("applications.empty.description")}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => registerDefaultsMutation.mutate()}>
                <Wand2 className="h-4 w-4 mr-2" />
                {t("applications.create.registerDefaults")}
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("applications.create.registerApp")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Apps Grid */}
      {!isLoading && apps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {apps.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getAppTypeIcon(app.app_type)}</span>
                    <div>
                      <CardTitle className="text-lg">{app.display_name || app.app_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{app.app_name}</p>
                    </div>
                  </div>
                  {app.is_active ? (
                    <Badge variant="secondary">{t("applications.list.active")}</Badge>
                  ) : (
                    <Badge variant="outline">{t("applications.list.inactive")}</Badge>
                  )}
                </div>
                {app.description && (
                  <CardDescription className="mt-2">{app.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("applications.list.type")}
                    </p>
                    <Badge variant="outline">{getAppTypeLabel(app.app_type)}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("applications.list.authMethods")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {app.allowed_auth_methods.map((method) => (
                        <Badge key={method} variant="secondary" className="text-xs">
                          {t(`applications.authMethods.${method}`) || method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(app)}>
                    <Edit className="h-4 w-4 mr-1" />
                    {t("applications.list.edit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(app)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t("applications.list.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("applications.edit.title")}</DialogTitle>
            <DialogDescription>
              {t("applications.edit.dialogDescription", { appName: selectedApp?.app_name || "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-display_name">
                {t("applications.create.fields.displayName")}
              </Label>
              <Input
                id="edit-display_name"
                value={formData.display_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">
                {t("applications.create.fields.description")}
              </Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("applications.create.fields.allowedAuthMethods")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {AUTH_METHODS.map((method) => (
                  <div key={method} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-auth-${method}`}
                      checked={formData.allowed_auth_methods?.includes(method) ?? false}
                      onCheckedChange={() => handleAuthMethodToggle(method)}
                    />
                    <label htmlFor={`edit-auth-${method}`} className="text-sm">
                      {t(`applications.authMethods.${method}`) || method}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t("applications.create.actions.cancel")}
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("applications.edit.saving")}
                </>
              ) : (
                t("applications.edit.saveChanges")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("applications.delete.title")}</DialogTitle>
            <DialogDescription>
              {t("applications.delete.dialogDescription", { appName: selectedApp?.app_name || "" })}
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("applications.delete.warning")}</AlertDescription>
          </Alert>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              {t("applications.create.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("applications.delete.deleting")}
                </>
              ) : (
                t("applications.delete.deleteApp")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Separator,
  Switch,
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  Edit,
  Globe,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { type CreateRealmRequest, type Realm, realmsApi } from "@/lib/api/realms";
import { useRealmStore } from "@/stores/realmStore";

export const Route = createFileRoute("/realms")({
  component: RealmsPage,
});

function RealmsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { setCurrentRealm, currentRealm, refreshRealms } = useRealmStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRealm, setSelectedRealm] = useState<Realm | null>(null);
  const [formData, setFormData] = useState<CreateRealmRequest>({
    name: "",
    description: "",
    display_name: "",
    organization_id: "",
    default_lease_ttl: 3600,
    max_lease_ttl: 86400,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch realms
  const {
    data: realmsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["realms"],
    queryFn: () => realmsApi.list(),
  });

  const realms = realmsData?.realms || [];

  // Create realm mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateRealmRequest) => realmsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["realms"] });
      refreshRealms();
      setIsCreateOpen(false);
      resetForm();
    },
  });

  // Update realm mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRealmRequest> }) =>
      realmsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["realms"] });
      refreshRealms();
      setIsEditOpen(false);
      setSelectedRealm(null);
      resetForm();
    },
  });

  // Delete realm mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => realmsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["realms"] });
      refreshRealms();
      setIsDeleteOpen(false);
      setSelectedRealm(null);
      // If deleted realm was selected, clear it
      if (currentRealm?.id === selectedRealm?.id) {
        setCurrentRealm(null);
      }
    },
  });

  const resetForm = () => {
    setFormData({ 
      name: "", 
      description: "", 
      display_name: "",
      organization_id: "",
      default_lease_ttl: 3600,
      max_lease_ttl: 86400,
    });
    setShowAdvanced(false);
  };

  const handleCreate = () => {
    if (formData.name) {
      createMutation.mutate(formData);
    }
  };

  const handleUpdate = () => {
    if (selectedRealm && formData.name) {
      updateMutation.mutate({
        id: selectedRealm.id,
        data: formData,
      });
    }
  };

  const handleDelete = () => {
    if (selectedRealm) {
      deleteMutation.mutate(selectedRealm.id);
    }
  };

  const openEditDialog = (realm: Realm) => {
    setSelectedRealm(realm);
    setFormData({
      name: realm.name,
      description: realm.description || "",
      display_name: realm.display_name || "",
      organization_id: realm.organization_id || "",
      default_lease_ttl: realm.default_lease_ttl || 3600,
      max_lease_ttl: realm.max_lease_ttl || 86400,
    });
    setShowAdvanced(false);
    setIsEditOpen(true);
  };

  const openDeleteDialog = (realm: Realm) => {
    setSelectedRealm(realm);
    setIsDeleteOpen(true);
  };

  const selectRealm = (realm: Realm) => {
    setCurrentRealm(realm);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("realms.title")}</h1>
          <p className="text-muted-foreground">{t("realms.subtitle")}</p>
        </div>

        {/* Create Realm Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("realms.create.button")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("realms.create.dialogTitle")}</DialogTitle>
              <DialogDescription>{t("realms.create.dialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">Basic Information</div>
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="name">{t("realms.create.fields.name")} *</Label>
                  <Input
                    id="name"
                    placeholder={t("realms.create.fields.namePlaceholder")}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    placeholder="Friendly display name"
                    value={formData.display_name || ""}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("realms.create.fields.description")}</Label>
                  <Input
                    id="description"
                    placeholder={t("realms.create.fields.descriptionPlaceholder")}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org_id">{t("realms.create.fields.organizationId")}</Label>
                  <Input
                    id="org_id"
                    placeholder={t("realms.create.fields.organizationIdPlaceholder")}
                    value={formData.organization_id}
                    onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  />
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? "▼" : "▶"} Advanced Settings
                </button>
                
                {showAdvanced && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="default_lease_ttl">Default Lease TTL (seconds)</Label>
                        <Input
                          id="default_lease_ttl"
                          type="number"
                          value={formData.default_lease_ttl || 3600}
                          onChange={(e) => setFormData({ ...formData, default_lease_ttl: parseInt(e.target.value, 10) || 3600 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max_lease_ttl">Max Lease TTL (seconds)</Label>
                        <Input
                          id="max_lease_ttl"
                          type="number"
                          value={formData.max_lease_ttl || 86400}
                          onChange={(e) => setFormData({ ...formData, max_lease_ttl: parseInt(e.target.value, 10) || 86400 })}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These TTL values are used as defaults for secrets and tokens created in this realm.
                    </p>
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t("realms.create.actions.cancel")}
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name || createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("realms.create.creating")}
                  </>
                ) : (
                  t("realms.create.actions.create")
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
            {error instanceof Error ? error.message : t("realms.errors.failedToLoad")}
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
      {!isLoading && realms.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("realms.empty.title")}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t("realms.empty.description")}
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("realms.create.button")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Realms Grid */}
      {!isLoading && realms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {realms.map((realm) => (
            <Card
              key={realm.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                currentRealm?.id === realm.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => selectRealm(realm)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{realm.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {currentRealm?.id === realm.id && (
                      <Badge variant="default" className="mr-2">
                        <Check className="h-3 w-3 mr-1" />
                        {t("realms.list.selected")}
                      </Badge>
                    )}
                    {realm.is_active !== false ? (
                      <Badge variant="secondary">{t("realms.list.active")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("realms.list.inactive")}</Badge>
                    )}
                  </div>
                </div>
                {realm.description && (
                  <CardDescription className="mt-2">{realm.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {realm.organization_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{realm.organization_name}</span>
                    </div>
                  )}
                  {realm.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {t("realms.list.created", {
                          date: new Date(realm.created_at).toLocaleDateString(),
                        })}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(realm);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {t("realms.list.edit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(realm);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t("realms.list.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("realms.edit.title")}</DialogTitle>
            <DialogDescription>
              {t("realms.edit.dialogDescription", { name: selectedRealm?.name || "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Status */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <Separator />
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-xs text-muted-foreground">
                    {selectedRealm?.is_active !== false ? "Realm is active and operational" : "Realm is disabled"}
                  </p>
                </div>
                <Switch
                  checked={selectedRealm?.is_active !== false}
                  disabled
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">Basic Information</div>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="edit-name">{t("realms.create.fields.name")}</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-display_name">Display Name</Label>
                <Input
                  id="edit-display_name"
                  value={formData.display_name || ""}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">{t("realms.create.fields.description")}</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            {/* TTL Settings */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">Lease Settings</div>
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-default_lease_ttl">Default Lease TTL (seconds)</Label>
                  <Input
                    id="edit-default_lease_ttl"
                    type="number"
                    value={formData.default_lease_ttl || 3600}
                    onChange={(e) => setFormData({ ...formData, default_lease_ttl: parseInt(e.target.value, 10) || 3600 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-max_lease_ttl">Max Lease TTL (seconds)</Label>
                  <Input
                    id="edit-max_lease_ttl"
                    type="number"
                    value={formData.max_lease_ttl || 86400}
                    onChange={(e) => setFormData({ ...formData, max_lease_ttl: parseInt(e.target.value, 10) || 86400 })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t("realms.create.actions.cancel")}
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name || updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("realms.edit.saving")}
                </>
              ) : (
                t("realms.edit.saveChanges")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("realms.delete.title")}</DialogTitle>
            <DialogDescription>
              {t("realms.delete.dialogDescription", { name: selectedRealm?.name || "" })}
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("realms.delete.warning")}
              <ul className="list-disc list-inside mt-2">
                <li>{t("realms.delete.associatedItems.applications")}</li>
                <li>{t("realms.delete.associatedItems.policies")}</li>
                <li>{t("realms.delete.associatedItems.users")}</li>
                <li>{t("realms.delete.associatedItems.secrets")}</li>
                <li>{t("realms.delete.associatedItems.approles")}</li>
              </ul>
            </AlertDescription>
          </Alert>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              {t("realms.create.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("realms.delete.deleting")}
                </>
              ) : (
                t("realms.delete.deleteRealm")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

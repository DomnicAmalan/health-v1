import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealmStore } from '@/stores/realmStore';
import {
  appsApi,
  type RealmApplication,
  type CreateAppRequest,
  type AppType,
  type AuthMethod,
  getAppTypeIcon,
  getAppTypeLabel,
  defaultAuthMethods,
} from '@/lib/api/apps';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from '@lazarus-life/ui-components';
import { 
  Plus, 
  Trash2, 
  Edit, 
  AppWindow, 
  Loader2, 
  AlertCircle, 
  Wand2,
  Globe 
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

const APP_TYPES: AppType[] = ['admin-ui', 'client-app', 'mobile', 'api'];
const AUTH_METHODS: AuthMethod[] = ['token', 'userpass', 'approle', 'jwt'];

export function ApplicationsPage() {
  const queryClient = useQueryClient();
  const { currentRealm, isGlobalMode } = useRealmStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<RealmApplication | null>(null);
  const [formData, setFormData] = useState<CreateAppRequest>({
    app_name: '',
    app_type: 'client-app',
    display_name: '',
    description: '',
    allowed_auth_methods: ['token', 'userpass'],
  });

  // Fetch apps for current realm
  const { data: apps = [], isLoading, error } = useQuery({
    queryKey: ['realm-apps', currentRealm?.id],
    queryFn: () => appsApi.list(currentRealm!.id),
    enabled: !!currentRealm && !isGlobalMode,
  });

  // Create app mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateAppRequest) => appsApi.create(currentRealm!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realm-apps', currentRealm?.id] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  // Update app mutation
  const updateMutation = useMutation({
    mutationFn: ({ appName, data }: { appName: string; data: Partial<CreateAppRequest> }) =>
      appsApi.update(currentRealm!.id, appName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realm-apps', currentRealm?.id] });
      setIsEditOpen(false);
      setSelectedApp(null);
      resetForm();
    },
  });

  // Delete app mutation
  const deleteMutation = useMutation({
    mutationFn: (appName: string) => appsApi.delete(currentRealm!.id, appName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realm-apps', currentRealm?.id] });
      setIsDeleteOpen(false);
      setSelectedApp(null);
    },
  });

  // Register defaults mutation
  const registerDefaultsMutation = useMutation({
    mutationFn: () => appsApi.registerDefaults(currentRealm!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realm-apps', currentRealm?.id] });
    },
  });

  const resetForm = () => {
    setFormData({
      app_name: '',
      app_type: 'client-app',
      display_name: '',
      description: '',
      allowed_auth_methods: ['token', 'userpass'],
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
      updateMutation.mutate({
        appName: selectedApp.app_name,
        data: {
          display_name: formData.display_name,
          description: formData.description,
          allowed_auth_methods: formData.allowed_auth_methods,
        },
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
      display_name: app.display_name || '',
      description: app.description || '',
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
            <h3 className="text-lg font-medium mb-2">Select a Realm</h3>
            <p className="text-muted-foreground text-center mb-4">
              Applications are realm-scoped. Please select a realm from the dropdown to manage applications.
            </p>
            <Link to="/realms">
              <Button>
                Go to Realms
              </Button>
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
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground">
            Manage applications in realm: <span className="font-medium">{currentRealm.name}</span>
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
            Register Defaults
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Register App
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Register Application</DialogTitle>
                <DialogDescription>
                  Register a new application in the {currentRealm.name} realm.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="app_name">Application Name</Label>
                <Input
                  id="app_name"
                  placeholder="my-mobile-app"
                  value={formData.app_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, app_name: e.target.value })}
                />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app_type">Application Type</Label>
                  <Select
                    value={formData.app_type}
                    onValueChange={(value: AppType) => handleAppTypeChange(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {APP_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getAppTypeIcon(type)} {getAppTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name (Optional)</Label>
                <Input
                  id="display_name"
                  placeholder="My Mobile App"
                  value={formData.display_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, display_name: e.target.value })}
                />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                />
                </div>
                <div className="space-y-2">
                  <Label>Allowed Auth Methods</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AUTH_METHODS.map((method) => (
                      <div key={method} className="flex items-center space-x-2">
                        <Checkbox
                          id={`auth-${method}`}
                          checked={formData.allowed_auth_methods?.includes(method)}
                          onCheckedChange={() => handleAuthMethodToggle(method)}
                        />
                        <label htmlFor={`auth-${method}`} className="text-sm">
                          {method}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formData.app_name || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Register App'
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
            {error instanceof Error ? error.message : 'Failed to load applications'}
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
            <h3 className="text-lg font-medium mb-2">No Applications</h3>
            <p className="text-muted-foreground text-center mb-4">
              Register your first application or use "Register Defaults" to create standard apps.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => registerDefaultsMutation.mutate()}>
                <Wand2 className="h-4 w-4 mr-2" />
                Register Defaults
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Register App
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
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
                {app.description && (
                  <CardDescription className="mt-2">
                    {app.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                    <Badge variant="outline">{getAppTypeLabel(app.app_type)}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Auth Methods</p>
                    <div className="flex flex-wrap gap-1">
                      {app.allowed_auth_methods.map((method) => (
                        <Badge key={method} variant="secondary" className="text-xs">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(app)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(app)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
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
            <DialogTitle>Edit Application</DialogTitle>
            <DialogDescription>
              Update settings for {selectedApp?.app_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-display_name">Display Name</Label>
              <Input
                id="edit-display_name"
                value={formData.display_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Allowed Auth Methods</Label>
              <div className="grid grid-cols-2 gap-2">
                {AUTH_METHODS.map((method) => (
                  <div key={method} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-auth-${method}`}
                      checked={formData.allowed_auth_methods?.includes(method)}
                      onCheckedChange={() => handleAuthMethodToggle(method)}
                    />
                    <label htmlFor={`edit-auth-${method}`} className="text-sm">
                      {method}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedApp?.app_name}"?
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will remove the application and any associated AppRoles.
            </AlertDescription>
          </Alert>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete App'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


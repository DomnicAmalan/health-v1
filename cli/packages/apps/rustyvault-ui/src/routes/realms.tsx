import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realmsApi, type Realm, type CreateRealmRequest } from '@/lib/api/realms';
import { useRealmStore } from '@/stores/realmStore';
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
} from '@lazarus-life/ui-components';
import { Plus, Trash2, Edit, Globe, Building2, Calendar, Loader2, AlertCircle, Check } from 'lucide-react';

export function RealmsPage() {
  const queryClient = useQueryClient();
  const { setCurrentRealm, currentRealm, refreshRealms } = useRealmStore();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRealm, setSelectedRealm] = useState<Realm | null>(null);
  const [formData, setFormData] = useState<CreateRealmRequest>({
    name: '',
    description: '',
    organization_id: '',
  });

  // Fetch realms
  const { data: realmsData, isLoading, error } = useQuery({
    queryKey: ['realms'],
    queryFn: () => realmsApi.list(),
  });

  const realms = realmsData?.realms || [];

  // Create realm mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateRealmRequest) => realmsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realms'] });
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
      queryClient.invalidateQueries({ queryKey: ['realms'] });
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
      queryClient.invalidateQueries({ queryKey: ['realms'] });
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
    setFormData({ name: '', description: '', organization_id: '' });
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
      description: realm.description || '',
      organization_id: realm.organization_id || '',
    });
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
          <h1 className="text-2xl font-bold">Realms</h1>
          <p className="text-muted-foreground">
            Manage multi-tenant realms for organization isolation
          </p>
        </div>
        
        {/* Create Realm Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Realm
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Realm</DialogTitle>
              <DialogDescription>
                Create a new realm for tenant isolation. Each realm has its own policies, secrets, and users.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Realm Name</Label>
                <Input
                  id="name"
                  placeholder="my-organization"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org_id">Organization ID (Optional)</Label>
                <Input
                  id="org_id"
                  placeholder="UUID of the organization"
                  value={formData.organization_id}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!formData.name || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Realm'
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
            {error instanceof Error ? error.message : 'Failed to load realms'}
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
            <h3 className="text-lg font-medium mb-2">No Realms Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first realm to start organizing tenants
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Realm
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
                currentRealm?.id === realm.id ? 'ring-2 ring-primary' : ''
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
                        Selected
                      </Badge>
                    )}
                    {realm.is_active !== false ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                </div>
                {realm.description && (
                  <CardDescription className="mt-2">
                    {realm.description}
                  </CardDescription>
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
                      <span>Created {new Date(realm.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditDialog(realm)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDeleteDialog(realm)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Realm</DialogTitle>
            <DialogDescription>
              Update realm settings for {selectedRealm?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Realm Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={!formData.name || updateMutation.isPending}
            >
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Realm</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedRealm?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Deleting this realm will also delete all associated:
              <ul className="list-disc list-inside mt-2">
                <li>Applications</li>
                <li>Policies</li>
                <li>Users</li>
                <li>Secrets</li>
                <li>AppRoles</li>
              </ul>
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
                'Delete Realm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

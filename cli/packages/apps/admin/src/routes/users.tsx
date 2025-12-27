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
  Input,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lazarus-life/ui-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Loader2,
  Mail,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { ProvisionUserDialog } from "@/components/users/ProvisionUserDialog";
import { apiClient } from "@/lib/api/client";
import { ProtectedButton, ProtectedPage } from "../lib/permissions";

interface User {
  id: string;
  email: string;
  display_name: string;
  organization_id?: string;
  organization_name?: string;
  role_name?: string;
  created_at: string;
  is_active: boolean;
}

interface Organization {
  id: string;
  name: string;
}

interface UsersListResponse {
  users: User[];
  total: number;
}

interface OrganizationsListResponse {
  organizations: Organization[];
}

// API functions
const usersApiAdmin = {
  list: async (search?: string): Promise<UsersListResponse> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await apiClient.get<UsersListResponse>(`/users${query}`);
    return response.data || { users: [], total: 0 };
  },
  delete: async (userId: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}`);
  },
};

const organizationsApi = {
  list: async (): Promise<Organization[]> => {
    const response = await apiClient.get<OrganizationsListResponse>("/organizations");
    return response.data?.organizations || [];
  },
};

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Fetch users
  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users", searchTerm],
    queryFn: () => usersApiAdmin.list(searchTerm || undefined),
  });

  // Fetch organizations for the provision dialog
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: organizationsApi.list,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: usersApiAdmin.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteUserId(null);
    },
  });

  const users = usersData?.users || [];
  const total = usersData?.total || 0;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <ProtectedPage pageName="users" fallback={<div className="p-6">{t("errors.forbidden")}</div>}>
      <div className="p-6">
        <Stack spacing="lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t("navigation.users")}</h1>
              <p className="text-muted-foreground">
                Manage users, roles, and access across the system
              </p>
            </div>
            <ProtectedButton buttonId="create-user" onClick={() => setIsProvisionOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Provision User
            </ProtectedButton>
          </div>

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error instanceof Error ? error.message : "Failed to load users"}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>
                    {total} {total === 1 ? "user" : "users"} total
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      className="pl-8 w-64"
                      value={searchTerm}
                      onChange={handleSearch}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-center">
                  <div className="space-y-4">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm
                          ? "Try a different search term"
                          : "Get started by provisioning your first user"}
                      </p>
                    </div>
                    {!searchTerm && (
                      <Button onClick={() => setIsProvisionOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Provision User
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.display_name}</span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.organization_name ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {user.organization_name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.role_name ? (
                            <Badge variant="secondary">
                              <Shield className="h-3 w-3 mr-1" />
                              {user.role_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">No role</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteUserId(user.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Stack>
      </div>

      {/* Provision User Dialog */}
      <ProvisionUserDialog
        open={isProvisionOpen}
        onOpenChange={setIsProvisionOpen}
        organizations={organizations}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will remove the user's access to all applications and revoke their vault
              credentials.
            </AlertDescription>
          </Alert>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteUserId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}

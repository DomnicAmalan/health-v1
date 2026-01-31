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
  Input,
  Label,
  Separator,
  Switch,
} from "@lazarus-life/ui-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  Globe,
  Loader2,
  Mail,
  Plus,
  Shield,
  Trash2,
  User as UserIcon,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PolicySelector } from "@/components/PolicySelector";
import { type CreateUserRequest, usersApi } from "@/lib/api";
import { useRealmStore } from "@/stores/realmStore";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

interface UserFormData extends CreateUserRequest {
  username: string;
  email?: string;
  display_name?: string;
  is_active?: boolean;
}

function UsersPage() {
  const queryClient = useQueryClient();
  const { currentRealm, isGlobalMode } = useRealmStore();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    password: "",
    policies: [],
    ttl: 3600,
    max_ttl: 86400,
    email: "",
    display_name: "",
    is_active: true,
  });

  // Reset selection when realm changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally want to reset when realm changes
  useEffect(() => {
    setSelectedUser(null);
    setIsCreating(false);
    setIsEditing(false);
    setFormData({
      username: "",
      password: "",
      policies: [],
      ttl: 3600,
      max_ttl: 86400,
      email: "",
      display_name: "",
      is_active: true,
    });
  }, [currentRealm?.id, isGlobalMode]);

  const resetForm = useCallback(() => {
    setFormData({
      username: "",
      password: "",
      policies: [],
      ttl: 3600,
      max_ttl: 86400,
      email: "",
      display_name: "",
      is_active: true,
    });
  }, []);

  // Fetch users list (realm-scoped or global)
  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users", currentRealm?.id, isGlobalMode],
    queryFn: () =>
      currentRealm && !isGlobalMode ? usersApi.listForRealm(currentRealm.id) : usersApi.list(),
  });

  // Fetch selected user details
  const { data: userDetails, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user", selectedUser, currentRealm?.id, isGlobalMode],
    queryFn: () => {
      if (!selectedUser) {
        throw new Error("User not selected");
      }
      return currentRealm && !isGlobalMode
        ? usersApi.readForRealm(currentRealm.id, selectedUser)
        : usersApi.read(selectedUser);
    },
    enabled: !!selectedUser && !isCreating,
  });

  // Create/update user mutation
  const saveUserMutation = useMutation({
    mutationFn: ({ username, ...request }: CreateUserRequest & { username: string }) =>
      currentRealm && !isGlobalMode
        ? usersApi.writeForRealm(currentRealm.id, username, request)
        : usersApi.write(username, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", currentRealm?.id, isGlobalMode] });
      queryClient.invalidateQueries({
        queryKey: ["user", selectedUser, currentRealm?.id, isGlobalMode],
      });
      setIsCreating(false);
      setIsEditing(false);
      resetForm();
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (username: string) =>
      currentRealm && !isGlobalMode
        ? usersApi.deleteForRealm(currentRealm.id, username)
        : usersApi.delete(username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", currentRealm?.id, isGlobalMode] });
      setSelectedUser(null);
    },
  });

  const handleSaveUser = () => {
    saveUserMutation.mutate(formData);
  };

  const handleEditUser = () => {
    if (userDetails?.data) {
      const user = userDetails.data;
      setFormData({
        username: user.username,
        password: "", // Password is not returned
        policies: user.policies,
        ttl: user.ttl,
        max_ttl: user.max_ttl,
        email: user.email || "",
        display_name: user.display_name || "",
        is_active: user.is_active ?? true,
      });
      setIsEditing(true);
    }
  };

  const users = usersData?.keys || [];
  const user = userDetails?.data;

  // Context indicator
  const contextLabel = currentRealm && !isGlobalMode ? `Realm: ${currentRealm.name}` : "Global";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">User Management</h1>
            <Badge variant={isGlobalMode ? "default" : "secondary"}>
              <Globe className="h-3 w-3 mr-1" />
              {contextLabel}
            </Badge>
          </div>
          <p className="text-muted-foreground">Manage UserPass authentication users</p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(true);
            setSelectedUser(null);
            setIsEditing(false);
            resetForm();
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New User
        </Button>
      </div>

      {/* No Realm Selected Info */}
      {isGlobalMode && (
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription>
            You are viewing global users. For realm-scoped users,{" "}
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
            {error instanceof Error ? error.message : "Failed to load users"}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
            </CardTitle>
            <CardDescription>
              {users.length} {users.length === 1 ? "user" : "users"}
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
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
                <p className="text-xs mt-1">Create your first user</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {users.map((username) => (
                  <button
                    key={username}
                    type="button"
                    className={`w-full flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors text-left ${
                      selectedUser === username ? "bg-primary/10 border-primary" : "hover:bg-accent"
                    }`}
                    onClick={() => {
                      setSelectedUser(username);
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedUser(username);
                        setIsCreating(false);
                        setIsEditing(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{username}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Details / Create Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {isCreating
                ? "Create New User"
                : isEditing
                  ? `Edit User: ${selectedUser}`
                  : selectedUser
                    ? `User: ${selectedUser}`
                    : users.length === 0
                      ? "Get Started"
                      : "Select a User"}
            </CardTitle>
            <CardDescription>
              {isCreating
                ? "Create a new UserPass user"
                : isEditing
                  ? "Update user settings"
                  : selectedUser
                    ? "View and manage user details"
                    : users.length === 0
                      ? "Create your first user to get started"
                      : "Select a user from the list to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCreating || isEditing ? (
              <div className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <UserIcon className="h-4 w-4" />
                    Basic Information
                  </div>
                  <Separator />
                  
                  {isCreating && (
                    <div className="space-y-2">
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="johndoe"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name || ""}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                {/* Authentication Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    Authentication
                  </div>
                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password {isEditing && "(leave blank to keep current)"}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={isEditing ? "••••••••" : "Enter password"}
                    />
                  </div>
                </div>

                {/* Access Control Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    Access Control
                  </div>
                  <Separator />

                  <PolicySelector
                    label="Policies"
                    selectedPolicies={formData.policies || []}
                    onPoliciesChange={(policies) => setFormData({ ...formData, policies })}
                    realmId={currentRealm?.id}
                    useGlobalMode={isGlobalMode}
                  />
                </div>

                {/* Token Settings Section */}
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">Token Settings</div>
                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ttl">Token TTL (seconds)</Label>
                      <Input
                        id="ttl"
                        type="number"
                        value={formData.ttl}
                        onChange={(e) =>
                          setFormData({ ...formData, ttl: parseInt(e.target.value, 10) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_ttl">Max Token TTL (seconds)</Label>
                      <Input
                        id="max_ttl"
                        type="number"
                        value={formData.max_ttl}
                        onChange={(e) =>
                          setFormData({ ...formData, max_ttl: parseInt(e.target.value, 10) || 0 })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Status Section (Edit mode only) */}
                {isEditing && (
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <Separator />

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="is_active" className="text-base">Active Status</Label>
                        <p className="text-sm text-muted-foreground">
                          {formData.is_active 
                            ? "User can log in and access resources" 
                            : "User is disabled and cannot log in"}
                        </p>
                      </div>
                      <Switch
                        id="is_active"
                        checked={formData.is_active ?? true}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSaveUser}
                    disabled={saveUserMutation.isPending || (!isEditing && !formData.username)}
                  >
                    {saveUserMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : isCreating ? (
                      "Create User"
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : selectedUser && isLoadingUser ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : selectedUser ? (
              <div className="space-y-6">
                {/* User Info Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold">{user?.display_name || user?.username || selectedUser}</p>
                      {user?.is_active !== false ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">@{user?.username || selectedUser}</p>
                  </div>
                </div>

                <Separator />

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <p className="font-medium flex items-center gap-1">
                      {user?.email ? (
                        <>
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {user.email}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Display Name</Label>
                    <p className="font-medium">{user?.display_name || <span className="text-muted-foreground">Not set</span>}</p>
                  </div>
                </div>

                {/* Policies */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Assigned Policies</Label>
                  <div className="flex flex-wrap gap-1">
                    {user?.policies && user.policies.length > 0 ? (
                      user.policies.map((policy) => {
                        const isAdmin = policy === "admin" || policy === "root";
                        const isDefault = policy === "default";
                        return (
                          <Badge
                            key={policy}
                            variant={isAdmin ? "destructive" : isDefault ? "outline" : "secondary"}
                          >
                            {policy}
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground text-sm">No policies assigned</span>
                    )}
                  </div>
                  {user?.policies && user.policies.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {user.policies.includes("admin") || user.policies.includes("root")
                        ? "This user has administrative access"
                        : user.policies.includes("writer")
                          ? "This user can read and write secrets"
                          : user.policies.includes("reader")
                            ? "This user has read-only access"
                            : "Standard user access"}
                    </p>
                  )}
                </div>

                {/* Token Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Token TTL</Label>
                    <p className="font-medium">{user?.ttl ?? "N/A"}s</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Max Token TTL</Label>
                    <p className="font-medium">{user?.max_ttl ?? "N/A"}s</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleEditUser} disabled={!user}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit User
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteUserMutation.mutate(selectedUser)}
                    disabled={deleteUserMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                  </Button>
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users yet</p>
                <p className="text-sm mt-2">Click "New User" to create your first user</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a user from the list to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

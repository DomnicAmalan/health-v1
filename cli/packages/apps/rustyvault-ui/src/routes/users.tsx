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
} from "@lazarus-life/ui-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Edit,
  Globe,
  Loader2,
  Plus,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PolicySelector } from "@/components/PolicySelector";
import { type CreateUserRequest, usersApi } from "@/lib/api";
import { useRealmStore } from "@/stores/realmStore";

export function UsersPage() {
  const queryClient = useQueryClient();
  const { currentRealm, isGlobalMode } = useRealmStore();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CreateUserRequest & { username: string }>({
    username: "",
    password: "",
    policies: [],
    ttl: 3600,
    max_ttl: 86400,
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
    });
  }, [currentRealm?.id, isGlobalMode]);

  const resetForm = useCallback(() => {
    setFormData({
      username: "",
      password: "",
      policies: [],
      ttl: 3600,
      max_ttl: 86400,
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
  const { data: userDetails } = useQuery({
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
                    : "Select a User"}
            </CardTitle>
            <CardDescription>
              {isCreating
                ? "Create a new UserPass user"
                : isEditing
                  ? "Update user settings"
                  : selectedUser
                    ? "View and manage user details"
                    : "Select a user from the list to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCreating || isEditing ? (
              <div className="space-y-4">
                {isCreating && (
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="johndoe"
                    />
                  </div>
                )}
                <div>
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
                <PolicySelector
                  label="Policies"
                  selectedPolicies={formData.policies || []}
                  onPoliciesChange={(policies) => setFormData({ ...formData, policies })}
                  realmId={currentRealm?.id}
                  useGlobalMode={isGlobalMode}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
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
                  <div>
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
            ) : selectedUser && user ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Username</Label>
                  <p className="font-medium">{user.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Assigned Policies</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.policies?.length > 0 ? (
                      user.policies.map((policy) => {
                        // Highlight special policies
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
                      <span className="text-muted-foreground">No policies assigned</span>
                    )}
                  </div>
                  {user.policies?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {user.policies.includes("admin") || user.policies.includes("root")
                        ? "⚠️ This user has administrative access"
                        : user.policies.includes("writer")
                          ? "This user can read and write secrets"
                          : user.policies.includes("reader")
                            ? "This user has read-only access"
                            : "Standard user access"}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Token TTL</Label>
                    <p className="font-medium">{user.ttl}s</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Max Token TTL</Label>
                    <p className="font-medium">{user.max_ttl}s</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleEditUser}>
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

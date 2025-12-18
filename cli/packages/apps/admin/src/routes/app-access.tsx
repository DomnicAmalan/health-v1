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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lazarus-life/ui-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AppWindow, Check, Download, Filter, Loader2, Users, X } from "lucide-react";
import { useState } from "react";
import { type AppAccessMatrix, appAccessApi } from "@/lib/api/app-access";
import { apiClient } from "@/lib/api/client";
import { ProtectedPage } from "../lib/permissions";

interface Organization {
  id: string;
  name: string;
}

interface OrganizationsListResponse {
  organizations: Organization[];
}

const organizationsApi = {
  list: async (): Promise<Organization[]> => {
    const response = await apiClient.get<OrganizationsListResponse>("/organizations");
    return response.organizations || [];
  },
};

type AccessLevel = "read" | "write" | "admin" | null;

const ACCESS_COLORS: Record<string, string> = {
  read: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  write: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export function AppAccessPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"grant" | "revoke">("grant");
  const [bulkApp, setBulkApp] = useState<string>("");
  const [bulkLevel, setBulkLevel] = useState<"read" | "write" | "admin">("read");

  // Fetch organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: organizationsApi.list,
  });

  // Fetch access matrix
  const {
    data: matrix,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["app-access-matrix", selectedOrg],
    queryFn: () => appAccessApi.getMatrix(selectedOrg || undefined),
  });

  // Grant mutation
  const grantMutation = useMutation({
    mutationFn: ({
      userId,
      appName,
      level,
    }: {
      userId: string;
      appName: string;
      level: "read" | "write" | "admin";
    }) => appAccessApi.grant(userId, appName, level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-access-matrix"] });
    },
  });

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: ({ userId, appName }: { userId: string; appName: string }) =>
      appAccessApi.revoke(userId, appName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-access-matrix"] });
    },
  });

  // Bulk grant mutation
  const bulkGrantMutation = useMutation({
    mutationFn: () =>
      appAccessApi.bulkGrant({
        user_ids: Array.from(selectedUsers),
        app_name: bulkApp,
        access_level: bulkLevel,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-access-matrix"] });
      setBulkDialogOpen(false);
      setSelectedUsers(new Set());
    },
  });

  // Bulk revoke mutation
  const bulkRevokeMutation = useMutation({
    mutationFn: () =>
      appAccessApi.bulkRevoke({
        user_ids: Array.from(selectedUsers),
        app_name: bulkApp,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-access-matrix"] });
      setBulkDialogOpen(false);
      setSelectedUsers(new Set());
    },
  });

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleAllUsers = () => {
    if (matrix?.users) {
      if (selectedUsers.size === matrix.users.length) {
        setSelectedUsers(new Set());
      } else {
        setSelectedUsers(new Set(matrix.users.map((u) => u.id)));
      }
    }
  };

  const handleCellClick = (userId: string, appName: string, currentLevel: AccessLevel) => {
    if (currentLevel) {
      // Revoke access
      revokeMutation.mutate({ userId, appName });
    } else {
      // Grant read access by default
      grantMutation.mutate({ userId, appName, level: "read" });
    }
  };

  const handleAccessLevelChange = (
    userId: string,
    appName: string,
    newLevel: "read" | "write" | "admin"
  ) => {
    grantMutation.mutate({ userId, appName, level: newLevel });
  };

  const openBulkDialog = (action: "grant" | "revoke") => {
    setBulkAction(action);
    setBulkDialogOpen(true);
  };

  const handleBulkSubmit = () => {
    if (bulkAction === "grant") {
      bulkGrantMutation.mutate();
    } else {
      bulkRevokeMutation.mutate();
    }
  };

  const apps = matrix?.apps || [];
  const users = matrix?.users || [];
  const access = matrix?.access || {};

  return (
    <ProtectedPage
      pageName="app-access"
      fallback={<div className="p-6">{t("errors.forbidden")}</div>}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">App Access</h1>
            <p className="text-muted-foreground">
              Manage user access to applications across your organization
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedUsers.size > 0 && (
              <>
                <Button variant="outline" onClick={() => openBulkDialog("grant")}>
                  <Check className="h-4 w-4 mr-2" />
                  Grant ({selectedUsers.size})
                </Button>
                <Button variant="outline" onClick={() => openBulkDialog("revoke")}>
                  <X className="h-4 w-4 mr-2" />
                  Revoke ({selectedUsers.size})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Organizations</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load access matrix"}
            </AlertDescription>
          </Alert>
        )}

        {/* Matrix Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Access Matrix</CardTitle>
                <CardDescription>
                  {users.length} users × {apps.length} apps
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={ACCESS_COLORS.read}>
                  Read
                </Badge>
                <Badge variant="outline" className={ACCESS_COLORS.write}>
                  Write
                </Badge>
                <Badge variant="outline" className={ACCESS_COLORS.admin}>
                  Admin
                </Badge>
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
                      {selectedOrg
                        ? "No users in this organization"
                        : "Provision users to manage their app access"}
                    </p>
                  </div>
                </div>
              </div>
            ) : apps.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div className="space-y-4">
                  <AppWindow className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">No apps configured</p>
                    <p className="text-sm text-muted-foreground">
                      Register apps in the Vault to manage access
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedUsers.size === users.length && users.length > 0}
                          onCheckedChange={toggleAllUsers}
                        />
                      </TableHead>
                      <TableHead className="min-w-[200px]">User</TableHead>
                      {apps.map((app) => (
                        <TableHead key={app} className="text-center min-w-[120px]">
                          {app}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.display_name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </TableCell>
                        {apps.map((app) => {
                          const level = access[user.id]?.[app] as AccessLevel;
                          return (
                            <TableCell key={app} className="text-center">
                              {level ? (
                                <Select
                                  value={level}
                                  onValueChange={(value: "read" | "write" | "admin") =>
                                    handleAccessLevelChange(user.id, app, value)
                                  }
                                >
                                  <SelectTrigger className={`w-20 h-7 ${ACCESS_COLORS[level]}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="read">Read</SelectItem>
                                    <SelectItem value="write">Write</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-20 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleCellClick(user.id, app, null)}
                                >
                                  —
                                </Button>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkAction === "grant" ? "Grant Access" : "Revoke Access"}</DialogTitle>
            <DialogDescription>
              {bulkAction === "grant"
                ? `Grant access to ${selectedUsers.size} selected users`
                : `Revoke access from ${selectedUsers.size} selected users`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="bulk-app-select" className="text-sm font-medium">
                Application
              </label>
              <Select id="bulk-app-select" value={bulkApp} onValueChange={setBulkApp}>
                <SelectTrigger>
                  <SelectValue placeholder="Select application" />
                </SelectTrigger>
                <SelectContent>
                  {apps.map((app) => (
                    <SelectItem key={app} value={app}>
                      {app}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {bulkAction === "grant" && (
              <div className="space-y-2">
                <label htmlFor="bulk-level-select" className="text-sm font-medium">
                  Access Level
                </label>
                <Select
                  id="bulk-level-select"
                  value={bulkLevel}
                  onValueChange={(v: "read" | "write" | "admin") => setBulkLevel(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="write">Write</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkSubmit}
              disabled={!bulkApp || bulkGrantMutation.isPending || bulkRevokeMutation.isPending}
              variant={bulkAction === "revoke" ? "destructive" : "default"}
            >
              {bulkGrantMutation.isPending || bulkRevokeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : bulkAction === "grant" ? (
                "Grant Access"
              ) : (
                "Revoke Access"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedPage>
  );
}

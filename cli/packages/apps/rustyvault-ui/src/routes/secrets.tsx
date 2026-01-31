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
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  File,
  Folder,
  Globe,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { secretsApi } from "@/lib/api";
import { SECRETS_QUERY_KEYS } from "@/lib/api/queryKeys";
import { useRealmStore } from "@/stores/realmStore";

export const Route = createFileRoute("/secrets")({
  component: SecretsPage,
});

function SecretsPage() {
  const queryClient = useQueryClient();
  const { currentRealm, isGlobalMode } = useRealmStore();

  const [currentPath, setCurrentPath] = useState("");
  const [selectedSecret, setSelectedSecret] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newSecretPath, setNewSecretPath] = useState("");
  const [secretData, setSecretData] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  // Reset state when realm changes
  useEffect(() => {
    setCurrentPath("");
    setSelectedSecret(null);
    setIsCreating(false);
    setSecretData({});
  }, []);

  // Fetch secrets list (realm-scoped or global)
  const {
    data: secrets,
    isLoading,
    error,
  } = useQuery({
    queryKey: SECRETS_QUERY_KEYS.list({
      path: currentPath,
      realmId: currentRealm?.id,
      isGlobal: isGlobalMode,
    }),
    queryFn: () =>
      currentRealm && !isGlobalMode
        ? secretsApi.listForRealm(currentRealm.id, currentPath)
        : secretsApi.list(currentPath),
    enabled: true,
  });

  // Fetch selected secret
  const { isLoading: isLoadingSecret } = useQuery({
    queryKey: selectedSecret
      ? SECRETS_QUERY_KEYS.detail({
          name: selectedSecret,
          realmId: currentRealm?.id,
          isGlobal: isGlobalMode,
        })
      : ["secret", null],
    queryFn: async () => {
      if (!selectedSecret) {
        throw new Error("Secret not selected");
      }
      const data =
        currentRealm && !isGlobalMode
          ? await secretsApi.readForRealm(currentRealm.id, selectedSecret)
          : await secretsApi.read(selectedSecret);
      setSecretData((data.data || {}) as Record<string, string>);
      return data;
    },
    enabled: !!selectedSecret,
  });

  // Create/update secret mutation
  const saveSecretMutation = useMutation({
    mutationFn: ({ path, data }: { path: string; data: Record<string, unknown> }) =>
      currentRealm && !isGlobalMode
        ? secretsApi.writeForRealm(currentRealm.id, path, data)
        : secretsApi.write(path, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECRETS_QUERY_KEYS.all });
      setIsCreating(false);
      setNewSecretPath("");
      setSecretData({});
    },
  });

  // Delete secret mutation
  const deleteSecretMutation = useMutation({
    mutationFn: (path: string) =>
      currentRealm && !isGlobalMode
        ? secretsApi.deleteForRealm(currentRealm.id, path)
        : secretsApi.delete(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECRETS_QUERY_KEYS.all });
      if (selectedSecret === currentPath) {
        setSelectedSecret(null);
      }
    },
  });

  const handleCreateSecret = () => {
    if (newSecretPath && Object.keys(secretData).length > 0) {
      saveSecretMutation.mutate({ path: newSecretPath, data: secretData });
    }
  };

  const handleUpdateSecret = () => {
    if (selectedSecret && Object.keys(secretData).length > 0) {
      saveSecretMutation.mutate({ path: selectedSecret, data: secretData });
    }
  };

  const handleAddKeyValue = () => {
    if (newKey && newValue) {
      setSecretData({ ...secretData, [newKey]: newValue });
      setNewKey("");
      setNewValue("");
    }
  };

  const handleRemoveKey = (key: string) => {
    const newData = { ...secretData };
    delete newData[key];
    setSecretData(newData);
  };

  const pathParts = currentPath.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => ({
    name: part,
    path: pathParts.slice(0, index + 1).join("/"),
  }));

  // Context indicator
  const contextLabel = currentRealm && !isGlobalMode ? `Realm: ${currentRealm.name}` : "Global";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Secrets</h1>
            <Badge variant={isGlobalMode ? "default" : "secondary"}>
              <Globe className="h-3 w-3 mr-1" />
              {contextLabel}
            </Badge>
          </div>
          <p className="text-muted-foreground">Manage your secrets and key-value pairs</p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(true);
            setSelectedSecret(null);
            setNewSecretPath("");
            setSecretData({});
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Secret
        </Button>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {currentRealm && !isGlobalMode && (
          <>
            <Badge variant="outline" className="text-xs">
              {currentRealm.name}
            </Badge>
            <span className="text-muted-foreground">/</span>
          </>
        )}
        <button
          type="button"
          onClick={() => setCurrentPath("")}
          className="text-muted-foreground hover:text-foreground"
        >
          secret
        </button>
        {breadcrumbs.map((crumb) => (
          <div key={crumb.path} className="flex items-center gap-2">
            <span className="text-muted-foreground">/</span>
            <button
              type="button"
              onClick={() => setCurrentPath(crumb.path)}
              className="text-muted-foreground hover:text-foreground"
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Secrets List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Secrets</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading..."
                : `${secrets?.length || 0} ${secrets?.length === 1 ? "item" : "items"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error instanceof Error ? error.message : "Failed to load secrets"}
                </AlertDescription>
              </Alert>
            ) : secrets && secrets.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {secrets.map((secret) => {
                  const isDirectory = secret.endsWith("/");
                  const secretName = isDirectory ? secret.slice(0, -1) : secret;
                  const fullPath = currentPath ? `${currentPath}/${secretName}` : secretName;

                  return (
                    <button
                      key={secret}
                      type="button"
                      className={`w-full flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors text-left ${
                        selectedSecret === fullPath
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => {
                        if (isDirectory) {
                          setCurrentPath(fullPath);
                          setSelectedSecret(null);
                        } else {
                          setSelectedSecret(fullPath);
                          setIsCreating(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (isDirectory) {
                            setCurrentPath(fullPath);
                            setSelectedSecret(null);
                          } else {
                            setSelectedSecret(fullPath);
                            setIsCreating(false);
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {isDirectory ? (
                          <Folder className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <File className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{secretName}</span>
                      </div>
                      {isDirectory && <Badge variant="secondary">Directory</Badge>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No secrets found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Secret Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {isCreating
                ? "Create New Secret"
                : selectedSecret
                  ? `Secret: ${selectedSecret}`
                  : "Select a Secret"}
            </CardTitle>
            <CardDescription>
              {isCreating
                ? "Create a new secret with key-value pairs"
                : selectedSecret
                  ? "View and edit secret data"
                  : "Select a secret from the list to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCreating ? (
              <div className="space-y-6">
                {/* Path Section */}
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">Secret Location</div>
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="secret-path">Secret Path *</Label>
                    <Input
                      id="secret-path"
                      value={newSecretPath}
                      onChange={(e) => setNewSecretPath(e.target.value)}
                      placeholder="myapp/database/password"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use forward slashes (/) to create nested paths
                    </p>
                  </div>
                </div>

                {/* Key-Value Section */}
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">Secret Data</div>
                  <Separator />

                  <div className="space-y-2">
                    <Label>Key-Value Pairs</Label>
                    {Object.keys(secretData).length > 0 ? (
                      <div className="space-y-2 border rounded-md p-3">
                        {Object.entries(secretData).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <Input value={key} readOnly className="font-mono text-sm" />
                              <Input value={value} readOnly className="font-mono text-sm" />
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveKey(key)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No key-value pairs added yet</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Key"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="font-mono"
                    />
                    <Input
                      placeholder="Value"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="font-mono"
                      type="password"
                    />
                    <Button onClick={handleAddKeyValue} disabled={!newKey || !newValue}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleCreateSecret}
                    disabled={
                      saveSecretMutation.isPending ||
                      !newSecretPath ||
                      Object.keys(secretData).length === 0
                    }
                  >
                    {saveSecretMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Create Secret
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : selectedSecret ? (
              <div className="space-y-4">
                {isLoadingSecret ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Key-Value Pairs</Label>
                      {Object.keys(secretData).length > 0 ? (
                        <div className="space-y-2 border rounded-md p-3">
                          {Object.entries(secretData).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <Input
                                  value={key}
                                  onChange={(e) => {
                                    const newData = { ...secretData };
                                    delete newData[key];
                                    newData[e.target.value] = value;
                                    setSecretData(newData);
                                  }}
                                  className="font-mono text-sm"
                                />
                                <Input
                                  value={value}
                                  onChange={(e) =>
                                    setSecretData({ ...secretData, [key]: e.target.value })
                                  }
                                  className="font-mono text-sm"
                                  type="password"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveKey(key)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No data in this secret</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Key"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        className="font-mono"
                      />
                      <Input
                        placeholder="Value"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        className="font-mono"
                        type="password"
                      />
                      <Button onClick={handleAddKeyValue} disabled={!newKey || !newValue}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleUpdateSecret}
                        disabled={
                          saveSecretMutation.isPending || Object.keys(secretData).length === 0
                        }
                      >
                        {saveSecretMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Edit className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => deleteSecretMutation.mutate(selectedSecret)}
                        disabled={deleteSecretMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deleteSecretMutation.isPending ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a secret from the list to view and edit</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

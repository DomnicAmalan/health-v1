import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Stack, Button, Input, Label, Badge, Alert, AlertDescription } from '@health-v1/ui-components';
import { systemApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Lock, Unlock, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export function SystemPage() {
  const [unsealKey, setUnsealKey] = useState('');
  const [initShares, setInitShares] = useState(1);
  const [initThreshold, setInitThreshold] = useState(1);
  const [initKey, setInitKey] = useState('');
  const queryClient = useQueryClient();
  const { hasPolicy } = useAuthStore();

  const { data: sealStatus, isLoading: isLoadingSeal } = useQuery({
    queryKey: ['sealStatus'],
    queryFn: () => systemApi.getSealStatus(),
    refetchInterval: 5000,
  });

  const { data: health, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['health'],
    queryFn: () => systemApi.getHealth(),
    refetchInterval: 10000,
  });

  const unsealMutation = useMutation({
    mutationFn: (key: string) => systemApi.unseal(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sealStatus'] });
      setUnsealKey('');
    },
  });

  const sealMutation = useMutation({
    mutationFn: () => systemApi.seal(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sealStatus'] });
    },
  });

  const initMutation = useMutation({
    mutationFn: (request: { secret_shares: number; secret_threshold: number }) => 
      systemApi.init(request),
    onSuccess: (data) => {
      setInitKey(data.keys_base64[0]);
      queryClient.invalidateQueries({ queryKey: ['sealStatus'] });
    },
  });

  const canManageSystem = hasPolicy('root');

  const handleUnseal = (e: React.FormEvent) => {
    e.preventDefault();
    if (unsealKey.trim()) {
      unsealMutation.mutate(unsealKey.trim());
    }
  };

  const handleInit = (e: React.FormEvent) => {
    e.preventDefault();
    initMutation.mutate({
      secret_shares: initShares,
      secret_threshold: initThreshold,
    });
  };

  const isInitialized = sealStatus !== undefined;
  const isSealed = sealStatus?.sealed ?? true;

  return (
    <div className="p-6">
      <Stack spacing="lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System</h1>
          <p className="text-muted-foreground">System operations and configuration</p>
        </div>

        {/* Seal Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isSealed ? (
                <>
                  <Lock className="h-5 w-5 text-destructive" />
                  Vault Status: Sealed
                </>
              ) : (
                <>
                  <Unlock className="h-5 w-5 text-green-600" />
                  Vault Status: Unsealed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSeal ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading status...
              </div>
            ) : sealStatus ? (
              <Stack spacing="md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant={isSealed ? 'destructive' : 'default'}>
                        {isSealed ? 'Sealed' : 'Unsealed'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Version</Label>
                    <div className="mt-1 text-sm">{sealStatus.version || '0.1.0'}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Unseal Progress</Label>
                    <div className="mt-1 text-sm">
                      {sealStatus.progress} / {sealStatus.n}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Storage Type</Label>
                    <div className="mt-1 text-sm">{sealStatus.storage_type || 'file'}</div>
                  </div>
                </div>

                {canManageSystem && !isSealed && (
                  <Button
                    variant="destructive"
                    onClick={() => sealMutation.mutate()}
                    disabled={sealMutation.isPending}
                  >
                    {sealMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sealing...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Seal Vault
                      </>
                    )}
                  </Button>
                )}
              </Stack>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to load seal status</p>
            )}
          </CardContent>
        </Card>

        {/* Unseal Card */}
        {isSealed && canManageSystem && (
          <Card>
            <CardHeader>
              <CardTitle>Unseal Vault</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUnseal}>
                <Stack spacing="md">
                  <div className="space-y-2">
                    <Label htmlFor="unseal-key">Unseal Key (Base64)</Label>
                    <Input
                      id="unseal-key"
                      type="text"
                      placeholder="Enter unseal key"
                      value={unsealKey}
                      onChange={(e) => setUnsealKey(e.target.value)}
                      disabled={unsealMutation.isPending}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter one of the unseal keys. Progress: {sealStatus?.progress || 0} / {sealStatus?.n || 0}
                    </p>
                  </div>
                  {unsealMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {unsealMutation.error instanceof Error
                          ? unsealMutation.error.message
                          : 'Failed to unseal vault'}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" disabled={unsealMutation.isPending}>
                    {unsealMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Unsealing...
                      </>
                    ) : (
                      <>
                        <Unlock className="mr-2 h-4 w-4" />
                        Unseal
                      </>
                    )}
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Initialization Card */}
        {!isInitialized && canManageSystem && (
          <Card>
            <CardHeader>
              <CardTitle>Initialize Vault</CardTitle>
            </CardHeader>
            <CardContent>
              {initMutation.isSuccess && initKey ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Vault initialized successfully!</p>
                      <div className="space-y-1">
                        <Label className="text-xs">Unseal Key (save this securely):</Label>
                        <div className="p-2 bg-muted rounded text-sm font-mono break-all">
                          {initKey}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Root Token:</Label>
                        <div className="p-2 bg-muted rounded text-sm font-mono break-all">
                          {initMutation.data?.root_token}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        ⚠️ Save these credentials securely. You will need the unseal key to unseal the vault.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleInit}>
                  <Stack spacing="md">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="secret-shares">Secret Shares</Label>
                        <Input
                          id="secret-shares"
                          type="number"
                          min="1"
                          max="255"
                          value={initShares}
                          onChange={(e) => setInitShares(parseInt(e.target.value) || 1)}
                          disabled={initMutation.isPending}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secret-threshold">Secret Threshold</Label>
                        <Input
                          id="secret-threshold"
                          type="number"
                          min="1"
                          max={initShares}
                          value={initThreshold}
                          onChange={(e) => setInitThreshold(parseInt(e.target.value) || 1)}
                          disabled={initMutation.isPending}
                          required
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For development, use 1 share and 1 threshold for easier management.
                    </p>
                    {initMutation.isError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {initMutation.error instanceof Error
                            ? initMutation.error.message
                            : 'Failed to initialize vault'}
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button type="submit" disabled={initMutation.isPending}>
                      {initMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Initialize Vault
                        </>
                      )}
                    </Button>
                  </Stack>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Health Check Card */}
        <Card>
          <CardHeader>
            <CardTitle>Health Check</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHealth ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading health status...
              </div>
            ) : health ? (
              <Stack spacing="sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Initialized</span>
                  <Badge variant={health.initialized ? 'default' : 'secondary'}>
                    {health.initialized ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sealed</span>
                  <Badge variant={health.sealed ? 'destructive' : 'default'}>
                    {health.sealed ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {health.version && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Version</span>
                    <span>{health.version}</span>
                  </div>
                )}
              </Stack>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to load health status</p>
            )}
          </CardContent>
        </Card>
      </Stack>
    </div>
  );
}

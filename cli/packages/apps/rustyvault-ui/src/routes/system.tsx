import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Stack, Button, Input, Label, Badge, Alert, AlertDescription } from '@lazarus-life/ui-components';
import { systemApi, type HealthStatus } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Lock, Unlock, RefreshCw, AlertCircle, CheckCircle2, Loader2, Copy, Download } from 'lucide-react';
import { UnsealLock } from '@/components/UnsealLock';

export function SystemPage() {
  const [unsealKey, setUnsealKey] = useState('');
  const [initShares, setInitShares] = useState(1);
  const [initThreshold, setInitThreshold] = useState(1);
  const [initKeys, setInitKeys] = useState<string[]>([]);
  const [initRootToken, setInitRootToken] = useState('');
  const [initDownloadToken, setInitDownloadToken] = useState('');
  const [downloadTokenInput, setDownloadTokenInput] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const queryClient = useQueryClient();
  const { hasPolicy } = useAuthStore();

  const { data: sealStatus, isLoading: isLoadingSeal } = useQuery({
    queryKey: ['sealStatus'],
    queryFn: () => systemApi.getSealStatus(),
    refetchInterval: 5000,
  });

  const { data: health, isLoading: isLoadingHealth } = useQuery<HealthStatus>({
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
      setInitKeys(data.keys_base64);
      setInitRootToken(data.root_token);
      if (data.download_token) {
        setInitDownloadToken(data.download_token);
      }
      queryClient.invalidateQueries({ queryKey: ['sealStatus'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });

  const handleDownloadKeys = async (token?: string) => {
    const tokenToUse = token || initDownloadToken;
    if (tokenToUse) {
      setIsDownloading(true);
      try {
        await systemApi.downloadKeysFile(tokenToUse);
      } catch (error) {
        console.error('Failed to download keys file:', error);
        alert('Failed to download keys file. Please try again.');
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

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

  // Check if vault is initialized - use health check which now correctly reports initialization status
  // Only show initialization card if health check explicitly says it's not initialized
  const isInitialized = health?.initialized ?? false;
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
        {isSealed && (canManageSystem || !isInitialized) && (
          <Card>
            <CardHeader>
              <CardTitle>Unseal Vault</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUnseal}>
                <Stack spacing="md">
                  {/* Visual Lock Component */}
                  {sealStatus && (
                    <UnsealLock
                      progress={sealStatus.progress || 0}
                      threshold={sealStatus.t || 1}
                      total={sealStatus.n || 1}
                    />
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="unseal-key">
                      Unseal Key (Base64) - Enter key {sealStatus ? (sealStatus.progress || 0) + 1 : 1} of {sealStatus?.t || 1}
                    </Label>
                    <Input
                      id="unseal-key"
                      type="text"
                      placeholder="Enter unseal key"
                      value={unsealKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnsealKey(e.target.value)}
                      disabled={unsealMutation.isPending}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter one of the unseal keys from your initialization. Each key can only be used once.
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
        {!isInitialized && (
          <Card>
            <CardHeader>
              <CardTitle>Initialize Vault</CardTitle>
            </CardHeader>
            <CardContent>
              {initMutation.isSuccess && initKeys.length > 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-lg">Vault initialized successfully!</p>
                        {initDownloadToken && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleDownloadKeys}
                            className="h-8"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Credentials File
                          </Button>
                        )}
                      </div>
                      
                      <Alert variant="default" className="bg-blue-50 dark:bg-blue-950">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <p className="font-semibold mb-1">Important: Download the credentials file!</p>
                          <p>The file contains your root token (needed to login) and all unseal keys. Save it securely.</p>
                        </AlertDescription>
                      </Alert>
                      
                      {/* Root Token */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Root Token (Use this to login):</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(initRootToken)}
                            className="h-7"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="p-3 bg-muted rounded text-sm font-mono break-all border">
                          {initRootToken}
                        </div>
                      </div>

                      {/* All Unseal Keys */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Unseal Keys ({initKeys.length} total, {initThreshold} needed to unseal):</Label>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {initKeys.map((key, index) => (
                            <div key={`unseal-key-${index}-${key.substring(0, 8)}`} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground">Unseal Key {index + 1}:</Label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(key)}
                                  className="h-6 text-xs"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                              </div>
                              <div className="p-2 bg-muted rounded text-xs font-mono break-all border">
                                {key}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Alert variant="default" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <p className="font-semibold mb-1">⚠️ Save these credentials securely!</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>You will need {initThreshold} of {initKeys.length} unseal keys to unseal the vault</li>
                            <li>Store keys in separate secure locations</li>
                            <li>The root token provides full access - keep it extremely secure</li>
                            <li>You cannot recover these keys if lost</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInitShares(Number.parseInt(e.target.value) || 1)}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInitThreshold(Number.parseInt(e.target.value) || 1)}
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

        {/* Authenticated Key Download Card */}
        {canManageSystem && isInitialized && (
          <Card>
            <CardHeader>
              <CardTitle>Download Unseal Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <Stack spacing="md">
                <div className="space-y-2">
                  <Label htmlFor="download-token">Download Token (from initialization):</Label>
                  <div className="flex gap-2">
                    <Input
                      id="download-token"
                      type="text"
                      placeholder="Enter download token from initialization"
                      value={downloadTokenInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDownloadTokenInput(e.target.value)}
                      disabled={isDownloading}
                    />
                    <Button
                      onClick={() => handleDownloadKeys(downloadTokenInput)}
                      disabled={isDownloading || !downloadTokenInput.trim()}
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If you have a download token from initialization, enter it here to download the credentials file.
                    Tokens expire after 1 hour.
                  </p>
                </div>
              </Stack>
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

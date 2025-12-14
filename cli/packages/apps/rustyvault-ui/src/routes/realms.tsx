import { Card, CardContent, CardDescription, CardHeader, CardTitle, Stack, Alert, AlertDescription } from '@lazarus-life/ui-components';
import { AlertCircle, Globe } from 'lucide-react';

export function RealmsPage() {
  return (
    <div className="p-6">
      <Stack spacing="lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Realms</h1>
          <p className="text-muted-foreground">Manage multi-tenant realms</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Realms feature is not yet implemented</p>
              <p className="text-sm">
                The realm module is planned for future implementation. Realms will allow you to:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                <li>Create isolated multi-tenant environments</li>
                <li>Manage realm-specific mounts and auth methods</li>
                <li>Implement realm-scoped operations</li>
                <li>Provide tenant isolation and security</li>
              </ul>
              <p className="text-sm mt-2">
                This feature is currently a placeholder and will be available in a future release.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Realm Management
            </CardTitle>
            <CardDescription>
              Multi-tenant realm management interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Coming Soon</p>
              <p className="text-sm">
                Realm management functionality will be implemented in a future update.
              </p>
            </div>
          </CardContent>
        </Card>
      </Stack>
    </div>
  );
}

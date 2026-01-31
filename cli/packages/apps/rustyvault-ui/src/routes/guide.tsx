import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lazarus-life/ui-components";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AppWindow,
  BookOpen,
  CheckCircle2,
  Globe,
  KeyRound,
  Lock,
  Shield,
  Users,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { SetupWizard } from "@/components/SetupWizard";

export const Route = createFileRoute("/guide")({
  component: GuidePage,
});

function GuidePage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Lazarus Life Vault Access Control Guide</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Learn how to configure access for different application types (Admin UI, Client App,
              Mobile App) using the realm-based multi-tenant architecture.
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)} size="lg">
            <Wand2 className="h-4 w-4 mr-2" />
            Start Setup Wizard
          </Button>
        </div>
      </div>

      {/* Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Architecture Overview</CardTitle>
          <CardDescription>
            The vault uses a realm-based multi-tenant architecture where each realm isolates all
            resources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <Globe className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold mb-1">Realms</h3>
                <p className="text-sm text-muted-foreground">
                  Tenant/organization boundaries that isolate all resources
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <AppWindow className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold mb-1">Applications</h3>
                <p className="text-sm text-muted-foreground">
                  Different clients (Admin UI, Client App, Mobile) that access the vault
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <Shield className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold mb-1">Policies</h3>
                <p className="text-sm text-muted-foreground">
                  Define what paths and operations are allowed
                </p>
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm">
                <strong>Flow:</strong> Realm → Applications → Policies → Users/AppRoles →
                Authentication
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-Step Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Step-by-Step Setup Flow</CardTitle>
          <CardDescription>
            Follow these steps to set up access control for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="w-8 h-8 flex items-center justify-center">1</Badge>
              <h3 className="text-xl font-semibold">Create a Realm</h3>
            </div>
            <p className="text-muted-foreground ml-10">
              A <strong>Realm</strong> is a tenant/organization boundary that isolates all
              resources.
            </p>
            <div className="ml-10 space-y-2">
              <p className="text-sm">
                <strong>Location:</strong> Sidebar →{" "}
                <Link to="/realms" className="text-primary hover:underline">
                  Realms
                </Link>
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  Click <strong>"Create Realm"</strong>
                </li>
                <li>Enter: Name, Description, Organization ID (optional)</li>
                <li>
                  Click <strong>"Create"</strong>
                </li>
                <li>
                  <strong>Select the realm</strong> from the list to work within it
                </li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-2 border-t pt-6">
            <div className="flex items-center gap-2">
              <Badge className="w-8 h-8 flex items-center justify-center">2</Badge>
              <h3 className="text-xl font-semibold">Register Applications</h3>
            </div>
            <p className="text-muted-foreground ml-10">
              Applications represent the different clients that will access the vault.
            </p>
            <div className="ml-10 space-y-3">
              <p className="text-sm">
                <strong>Location:</strong> Sidebar →{" "}
                <Link to="/applications" className="text-primary hover:underline">
                  Applications
                </Link>{" "}
                (requires realm selected)
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold mb-1">Option A: Quick Setup</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>
                      Click <strong>"Register Defaults"</strong> - automatically creates admin-ui,
                      client-app, and mobile apps with appropriate auth methods
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Option B: Manual Registration</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>
                      Click <strong>"Register Application"</strong>
                    </li>
                    <li>Fill in:</li>
                    <ul className="list-circle list-inside ml-4 space-y-1">
                      <li>
                        <strong>App Name:</strong> e.g.,{" "}
                        <code className="bg-muted px-1 rounded">admin-ui</code>,{" "}
                        <code className="bg-muted px-1 rounded">client-app</code>,{" "}
                        <code className="bg-muted px-1 rounded">mobile</code>
                      </li>
                      <li>
                        <strong>App Type:</strong> Admin UI, Client App, Mobile App, or API
                      </li>
                      <li>
                        <strong>Display Name:</strong> Human-readable name
                      </li>
                      <li>
                        <strong>Allowed Auth Methods:</strong>
                        <ul className="list-square list-inside ml-4 mt-1 space-y-1">
                          <li>
                            Admin UI: <code className="bg-muted px-1 rounded">token</code>,{" "}
                            <code className="bg-muted px-1 rounded">userpass</code>
                          </li>
                          <li>
                            Client App: <code className="bg-muted px-1 rounded">token</code>,{" "}
                            <code className="bg-muted px-1 rounded">userpass</code>
                          </li>
                          <li>
                            Mobile App: <code className="bg-muted px-1 rounded">jwt</code>,{" "}
                            <code className="bg-muted px-1 rounded">approle</code>
                          </li>
                          <li>
                            API: <code className="bg-muted px-1 rounded">approle</code>
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-2 border-t pt-6">
            <div className="flex items-center gap-2">
              <Badge className="w-8 h-8 flex items-center justify-center">3</Badge>
              <h3 className="text-xl font-semibold">Create Policies</h3>
            </div>
            <p className="text-muted-foreground ml-10">
              Policies define what paths and operations are allowed.
            </p>
            <div className="ml-10 space-y-3">
              <p className="text-sm">
                <strong>Location:</strong> Sidebar →{" "}
                <Link to="/policies" className="text-primary hover:underline">
                  Policies
                </Link>
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  Click <strong>"New Policy"</strong>
                </li>
                <li>
                  Enter <strong>Policy Name</strong> (e.g.,{" "}
                  <code className="bg-muted px-1 rounded">admin-policy</code>,{" "}
                  <code className="bg-muted px-1 rounded">reader-policy</code>)
                </li>
                <li>
                  Use <strong>Visual Builder</strong> to add path rules:
                </li>
                <ul className="list-circle list-inside ml-4 space-y-1">
                  <li>
                    Select path template or enter custom path (e.g.,{" "}
                    <code className="bg-muted px-1 rounded">secret/data/*</code>)
                  </li>
                  <li>
                    Check capabilities: <code className="bg-muted px-1 rounded">create</code>,{" "}
                    <code className="bg-muted px-1 rounded">read</code>,{" "}
                    <code className="bg-muted px-1 rounded">update</code>,{" "}
                    <code className="bg-muted px-1 rounded">delete</code>,{" "}
                    <code className="bg-muted px-1 rounded">list</code>
                  </li>
                </ul>
                <li>
                  Add multiple rules with <strong>"Add Path"</strong>
                </li>
                <li>
                  Click <strong>"Create Policy"</strong>
                </li>
              </ul>
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">Example Policies:</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Policy</th>
                        <th className="text-left p-2">Paths</th>
                        <th className="text-left p-2">Capabilities</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2">
                          <code className="bg-muted px-1 rounded">admin-policy</code>
                        </td>
                        <td className="p-2">
                          <code className="bg-muted px-1 rounded">secret/*</code>,{" "}
                          <code className="bg-muted px-1 rounded">sys/*</code>
                        </td>
                        <td className="p-2">create, read, update, delete, list</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">
                          <code className="bg-muted px-1 rounded">reader-policy</code>
                        </td>
                        <td className="p-2">
                          <code className="bg-muted px-1 rounded">secret/data/*</code>
                        </td>
                        <td className="p-2">read, list</td>
                      </tr>
                      <tr>
                        <td className="p-2">
                          <code className="bg-muted px-1 rounded">writer-policy</code>
                        </td>
                        <td className="p-2">
                          <code className="bg-muted px-1 rounded">secret/data/*</code>
                        </td>
                        <td className="p-2">create, read, update</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-2 border-t pt-6">
            <div className="flex items-center gap-2">
              <Badge className="w-8 h-8 flex items-center justify-center">4</Badge>
              <h3 className="text-xl font-semibold">Create Users (for Admin UI / Client App)</h3>
            </div>
            <p className="text-muted-foreground ml-10">Users authenticate via username/password.</p>
            <div className="ml-10 space-y-2">
              <p className="text-sm">
                <strong>Location:</strong> Sidebar →{" "}
                <Link to="/users" className="text-primary hover:underline">
                  Users
                </Link>
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  Click <strong>"New User"</strong>
                </li>
                <li>Enter:</li>
                <ul className="list-circle list-inside ml-4 space-y-1">
                  <li>
                    <strong>Username</strong>
                  </li>
                  <li>
                    <strong>Password</strong>
                  </li>
                  <li>
                    <strong>Policies</strong> (comma-separated, e.g.,{" "}
                    <code className="bg-muted px-1 rounded">admin-policy, default</code>)
                  </li>
                  <li>
                    <strong>Token TTL</strong> (seconds)
                  </li>
                </ul>
                <li>
                  Click <strong>"Create User"</strong>
                </li>
              </ul>
            </div>
          </div>

          {/* Step 5 */}
          <div className="space-y-2 border-t pt-6">
            <div className="flex items-center gap-2">
              <Badge className="w-8 h-8 flex items-center justify-center">5</Badge>
              <h3 className="text-xl font-semibold">Create AppRoles (for Mobile App / API)</h3>
            </div>
            <p className="text-muted-foreground ml-10">
              AppRoles are for machine-to-machine authentication.
            </p>
            <div className="ml-10 space-y-2">
              <p className="text-sm">
                <strong>Location:</strong> Sidebar →{" "}
                <Link to="/approles" className="text-primary hover:underline">
                  AppRoles
                </Link>{" "}
                (requires realm selected)
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  Click <strong>"Create AppRole"</strong>
                </li>
                <li>Enter:</li>
                <ul className="list-circle list-inside ml-4 space-y-1">
                  <li>
                    <strong>Role Name:</strong> e.g.,{" "}
                    <code className="bg-muted px-1 rounded">mobile-role</code>,{" "}
                    <code className="bg-muted px-1 rounded">api-role</code>
                  </li>
                  <li>
                    <strong>Bind Secret ID:</strong> Enable (recommended)
                  </li>
                  <li>
                    <strong>Secret ID TTL:</strong> e.g., 3600 (1 hour)
                  </li>
                  <li>
                    <strong>Token TTL:</strong> e.g., 3600
                  </li>
                  <li>
                    <strong>Policies:</strong> Check the policies to attach (e.g.,{" "}
                    <code className="bg-muted px-1 rounded">default</code>,{" "}
                    <code className="bg-muted px-1 rounded">reader</code>)
                  </li>
                </ul>
                <li>
                  Click <strong>"Create Role"</strong>
                </li>
                <li>
                  <strong>Generate Secret ID</strong> for each role (one-time, save securely!)
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication Flows */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Flows by App Type</CardTitle>
          <CardDescription>
            How different application types authenticate with the vault
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Admin UI Authentication</h3>
            </div>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm">
              User → Username/Password → Vault → Token → Access with admin-policy
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AppWindow className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Client App Authentication</h3>
            </div>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm">
              User → Username/Password → Vault → Token → Access with reader/writer-policy
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Mobile App / API Authentication</h3>
            </div>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm">
              App → Role ID + Secret ID → Vault → Token → Access with assigned policies
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complete Setup Example */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Setup Example</CardTitle>
          <CardDescription>Example setup for a new organization "Acme Corp"</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold">1. Create Realm:</span>
                <code className="bg-muted px-2 py-1 rounded">acme-corp</code>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold">2. Register Apps:</span>
                <span className="text-sm text-muted-foreground">
                  Click "Register Defaults" or manually create:
                </span>
              </div>
              <ul className="list-disc list-inside ml-7 space-y-1 text-sm text-muted-foreground">
                <li>
                  <code className="bg-muted px-1 rounded">admin-ui</code> (Admin UI type,
                  token+userpass)
                </li>
                <li>
                  <code className="bg-muted px-1 rounded">client-app</code> (Client App type,
                  token+userpass)
                </li>
                <li>
                  <code className="bg-muted px-1 rounded">mobile</code> (Mobile type, jwt+approle)
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold">3. Create Policies:</span>
              </div>
              <ul className="list-disc list-inside ml-7 space-y-1 text-sm text-muted-foreground">
                <li>
                  <code className="bg-muted px-1 rounded">admin-policy</code>: full access to{" "}
                  <code className="bg-muted px-1 rounded">secret/*</code>
                </li>
                <li>
                  <code className="bg-muted px-1 rounded">app-reader</code>: read access to{" "}
                  <code className="bg-muted px-1 rounded">secret/data/acme/*</code>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold">4. Create Admin User:</span>
                <code className="bg-muted px-2 py-1 rounded">admin@acme.com</code>
                <span className="text-sm text-muted-foreground">with</span>
                <code className="bg-muted px-2 py-1 rounded">admin-policy</code>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold">5. Create AppRole:</span>
                <code className="bg-muted px-2 py-1 rounded">mobile-role</code>
                <span className="text-sm text-muted-foreground">with</span>
                <code className="bg-muted px-2 py-1 rounded">app-reader</code>
                <span className="text-sm text-muted-foreground">policy</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold">6. Distribute credentials:</span>
              </div>
              <ul className="list-disc list-inside ml-7 space-y-1 text-sm text-muted-foreground">
                <li>Admin: username/password</li>
                <li>Mobile: role_id + secret_id</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Navigate to different sections of the vault</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Link to="/realms">
              <Button variant="outline" className="w-full justify-start">
                <Globe className="h-4 w-4 mr-2" />
                Realms
              </Button>
            </Link>
            <Link to="/applications">
              <Button variant="outline" className="w-full justify-start">
                <AppWindow className="h-4 w-4 mr-2" />
                Applications
              </Button>
            </Link>
            <Link to="/policies">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Policies
              </Button>
            </Link>
            <Link to="/users">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Users
              </Button>
            </Link>
            <Link to="/approles">
              <Button variant="outline" className="w-full justify-start">
                <KeyRound className="h-4 w-4 mr-2" />
                AppRoles
              </Button>
            </Link>
            <Link to="/secrets">
              <Button variant="outline" className="w-full justify-start">
                <Lock className="h-4 w-4 mr-2" />
                Secrets
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Setup Wizard */}
      <SetupWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}

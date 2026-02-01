/**
 * Wards Page
 * Ward management with census and bed allocation
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import type { Ward } from "@lazarus-life/shared/types/departments";
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Flex,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@lazarus-life/ui-components";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bed, Building, ClipboardList, Plus, Settings, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { DepartmentStats, WardList } from "@/components/departments";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { useAllWardsCensus, useCreateWard, useWards } from "@/hooks/api/departments";

export const Route = createFileRoute("/wards")({
  component: WardsComponent,
});

function WardsComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.DEPARTMENTS.WARDS_VIEW} resource="wards">
      <WardsPageInner />
    </ProtectedRoute>
  );
}

function WardsPageInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("list");
  const [showAddWard, setShowAddWard] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  // Form state
  const [wardCode, setWardCode] = useState("");
  const [wardName, setWardName] = useState("");
  const [specialty, setSpecialty] = useState("general");
  const [totalBeds, setTotalBeds] = useState("0");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  // Get ward stats
  const { data: wardsData } = useWards();
  const { data: censusData } = useAllWardsCensus();
  const createWardMutation = useCreateWard();

  const wards = wardsData?.data ?? [];
  const activeWards = wards.filter((w: Ward) => w.status === "active").length;
  const wardTotalBeds = wards.reduce((sum: number, w: Ward) => sum + w.totalBeds, 0);
  const availableBeds = wards.reduce((sum: number, w: Ward) => sum + w.availableBeds, 0);

  const handleWardSelect = useCallback((ward: Ward) => {
    setSelectedWard(ward);
  }, []);

  const handleCreateWard = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await createWardMutation.mutateAsync({
          wardCode,
          wardName,
          specialty: specialty as Ward["specialty"],
          totalBeds: Number.parseInt(totalBeds, 10),
          location: location || undefined,
          description: description || undefined,
        });
        toast.success("Ward created successfully");
        setShowAddWard(false);
        // Reset form
        setWardCode("");
        setWardName("");
        setSpecialty("general");
        setTotalBeds("0");
        setLocation("");
        setDescription("");
      } catch (_error) {
        toast.error("Failed to create ward");
      }
    },
    [wardCode, wardName, specialty, totalBeds, location, description, createWardMutation]
  );

  const handleViewBeds = useCallback(
    (ward: Ward) => {
      navigate({ to: "/beds", search: { wardId: ward.id } });
    },
    [navigate]
  );

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" justify="between">
        <Box>
          <h1 className="text-3xl font-bold">{t("wards.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("wards.subtitle")}</p>
        </Box>
        <Button onClick={() => setShowAddWard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Ward
        </Button>
      </Flex>

      {/* Quick Stats */}
      <Box className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("list")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Building className="h-6 w-6 text-blue-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{wards.length}</p>
                <p className="text-sm text-muted-foreground">Total Wards</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("list")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Building className="h-6 w-6 text-green-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{activeWards}</p>
                <p className="text-sm text-muted-foreground">Active Wards</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("list")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-gray-100 dark:bg-gray-900/30">
                <Users className="h-6 w-6 text-gray-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{wardTotalBeds}</p>
                <p className="text-sm text-muted-foreground">Total Beds</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("list")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Users className="h-6 w-6 text-purple-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{availableBeds}</p>
                <p className="text-sm text-muted-foreground">Available Beds</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>
      </Box>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <Building className="h-4 w-4" />
            Ward List
          </TabsTrigger>
          <TabsTrigger value="census" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Census
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <Users className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <Box className="mt-4">
          <TabsContent value="list">
            <WardList onWardSelect={handleWardSelect} />
          </TabsContent>

          <TabsContent value="census">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Ward Census
                </CardTitle>
                <CardDescription>
                  Current patient census by ward with occupancy details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {censusData?.wards && censusData.wards.length > 0 ? (
                  <Box className="space-y-4">
                    {censusData.wards.map((ward) => (
                      <Box
                        key={ward.wardId}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <Box>
                          <p className="font-medium">{ward.wardName}</p>
                          <p className="text-sm text-muted-foreground">
                            {ward.occupied} occupied / {ward.available} available
                          </p>
                        </Box>
                        <Badge
                          variant={
                            ward.occupancyRate > 80
                              ? "destructive"
                              : ward.occupancyRate > 60
                                ? "secondary"
                                : "default"
                          }
                        >
                          {ward.occupancyRate.toFixed(0)}% occupancy
                        </Badge>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box className="text-center text-muted-foreground py-8">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No census data available</p>
                  </Box>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            <DepartmentStats />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Ward Settings
                </CardTitle>
                <CardDescription>
                  Configure ward specialties, bed configurations, and staffing rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Box className="space-y-4">
                  <Box>
                    <h3 className="font-medium mb-3">Ward Specialties</h3>
                    <Box className="flex flex-wrap gap-2">
                      {[
                        "general",
                        "icu",
                        "nicu",
                        "picu",
                        "ccu",
                        "emergency",
                        "maternity",
                        "pediatrics",
                        "surgery",
                        "isolation",
                      ].map((spec) => (
                        <Badge key={spec} variant="outline" className="px-3 py-1">
                          {spec.replace("_", " ").toUpperCase()}
                        </Badge>
                      ))}
                    </Box>
                  </Box>
                  <Box>
                    <h3 className="font-medium mb-3">Default Bed Types</h3>
                    <Box className="flex flex-wrap gap-2">
                      {["general", "icu", "isolation", "pediatric", "maternity"].map((type) => (
                        <Badge key={type} variant="secondary" className="px-3 py-1">
                          {type.replace("_", " ").toUpperCase()}
                        </Badge>
                      ))}
                    </Box>
                  </Box>
                  <Box>
                    <h3 className="font-medium mb-3">Staffing Guidelines</h3>
                    <Box className="grid grid-cols-2 gap-4 text-sm">
                      <Box className="p-3 border rounded">
                        <p className="font-medium">General Ward</p>
                        <p className="text-muted-foreground">1 nurse : 6 patients</p>
                      </Box>
                      <Box className="p-3 border rounded">
                        <p className="font-medium">ICU</p>
                        <p className="text-muted-foreground">1 nurse : 2 patients</p>
                      </Box>
                      <Box className="p-3 border rounded">
                        <p className="font-medium">NICU/PICU</p>
                        <p className="text-muted-foreground">1 nurse : 2-3 patients</p>
                      </Box>
                      <Box className="p-3 border rounded">
                        <p className="font-medium">Emergency</p>
                        <p className="text-muted-foreground">1 nurse : 4 patients</p>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </TabsContent>
        </Box>
      </Tabs>

      {/* Add Ward Dialog */}
      <Dialog open={showAddWard} onOpenChange={setShowAddWard}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Ward</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateWard} className="space-y-4">
            <Box className="grid grid-cols-2 gap-4">
              <Box className="space-y-2">
                <Label htmlFor="wardCode">Ward Code *</Label>
                <Input
                  id="wardCode"
                  value={wardCode}
                  onChange={(e) => setWardCode(e.target.value)}
                  placeholder="e.g., W-ICU-01"
                  required={true}
                />
              </Box>
              <Box className="space-y-2">
                <Label htmlFor="totalBeds">Total Beds *</Label>
                <Input
                  id="totalBeds"
                  type="number"
                  min="1"
                  value={totalBeds}
                  onChange={(e) => setTotalBeds(e.target.value)}
                  required={true}
                />
              </Box>
            </Box>
            <Box className="space-y-2">
              <Label htmlFor="wardName">Ward Name *</Label>
              <Input
                id="wardName"
                value={wardName}
                onChange={(e) => setWardName(e.target.value)}
                placeholder="e.g., ICU Ward A"
                required={true}
              />
            </Box>
            <Box className="space-y-2">
              <Label htmlFor="specialty">Specialty *</Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger id="specialty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="icu">ICU</SelectItem>
                  <SelectItem value="nicu">NICU</SelectItem>
                  <SelectItem value="picu">PICU</SelectItem>
                  <SelectItem value="ccu">CCU</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="maternity">Maternity</SelectItem>
                  <SelectItem value="pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                  <SelectItem value="isolation">Isolation</SelectItem>
                </SelectContent>
              </Select>
            </Box>
            <Box className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Building A, Floor 3"
              />
            </Box>
            <Box className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details..."
                rows={3}
              />
            </Box>
            <Flex gap="sm" justify="end">
              <Button type="button" variant="outline" onClick={() => setShowAddWard(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWardMutation.isPending}>
                {createWardMutation.isPending ? "Creating..." : "Create Ward"}
              </Button>
            </Flex>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ward Details Dialog */}
      <Dialog open={!!selectedWard} onOpenChange={(open) => !open && setSelectedWard(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedWard?.wardName}</DialogTitle>
          </DialogHeader>
          {selectedWard && (
            <Box className="space-y-4">
              <Flex align="center" justify="between">
                <Box>
                  <p className="text-sm text-muted-foreground">Ward Code</p>
                  <p className="font-medium">{selectedWard.wardCode}</p>
                </Box>
                <Badge variant={selectedWard.status === "active" ? "default" : "secondary"}>
                  {selectedWard.status.charAt(0).toUpperCase() + selectedWard.status.slice(1)}
                </Badge>
              </Flex>

              <Box className="grid grid-cols-3 gap-4">
                <Box>
                  <p className="text-sm text-muted-foreground">Specialty</p>
                  <p className="font-medium">{selectedWard.specialty.replace("_", " ")}</p>
                </Box>
                <Box>
                  <p className="text-sm text-muted-foreground">Total Beds</p>
                  <p className="font-medium">{selectedWard.totalBeds}</p>
                </Box>
                <Box>
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="font-medium text-green-600">{selectedWard.availableBeds}</p>
                </Box>
              </Box>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleViewBeds(selectedWard)}
              >
                <Bed className="mr-2 h-4 w-4" />
                View Beds
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

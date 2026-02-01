/**
 * Beds Page
 * Bed management with visual bed board and allocation
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import type { Bed as BedType } from "@lazarus-life/shared/types/departments";
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
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import { Bed, Calendar, Grid3X3, History, Plus, RefreshCw, Settings, User } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { BedBoard, WardList } from "@/components/departments";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { useBedHistory, useBedOccupancy, useCreateBed } from "@/hooks/api/departments";

export const Route = createFileRoute("/beds")({
  component: BedsComponent,
});

function BedsComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.DEPARTMENTS.BEDS_VIEW} resource="beds">
      <BedsPageInner />
    </ProtectedRoute>
  );
}

function BedsPageInner() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("board");
  const [showAddBed, setShowAddBed] = useState(false);
  const [selectedBed, setSelectedBed] = useState<BedType | null>(null);

  // Form state
  const [bedCode, setBedCode] = useState("");
  const [wardId, setWardId] = useState("");
  const [bedType, setBedType] = useState("general");
  const [location, setLocation] = useState("");

  // Get occupancy stats
  const { data: occupancyData, refetch: refetchOccupancy } = useBedOccupancy();
  const { data: historyData } = useBedHistory();
  const createBedMutation = useCreateBed();

  const handleBedSelect = useCallback((bed: BedType) => {
    setSelectedBed(bed);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchOccupancy();
  }, [refetchOccupancy]);

  const handleCreateBed = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await createBedMutation.mutateAsync({
          bedCode,
          wardId,
          bedType: bedType as BedType["bedType"],
          location: location || undefined,
        });
        toast.success("Bed created successfully");
        setShowAddBed(false);
        // Reset form
        setBedCode("");
        setWardId("");
        setBedType("general");
        setLocation("");
      } catch (_error) {
        toast.error("Failed to create bed");
      }
    },
    [bedCode, wardId, bedType, location, createBedMutation]
  );

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" justify="between">
        <Box>
          <h1 className="text-3xl font-bold">{t("beds.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("beds.subtitle")}</p>
        </Box>
        <Flex gap="sm">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddBed(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bed
          </Button>
        </Flex>
      </Flex>

      {/* Quick Stats */}
      <Box className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("board")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-gray-100 dark:bg-gray-900/30">
                <Bed className="h-6 w-6 text-gray-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{occupancyData?.total ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Beds</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("board")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Bed className="h-6 w-6 text-green-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{occupancyData?.available ?? 0}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("board")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <Bed className="h-6 w-6 text-red-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{occupancyData?.occupied ?? 0}</p>
                <p className="text-sm text-muted-foreground">Occupied</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("board")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Grid3X3 className="h-6 w-6 text-blue-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">
                  {occupancyData?.occupancyRate?.toFixed(1) ?? 0}%
                </p>
                <p className="text-sm text-muted-foreground">Occupancy Rate</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>
      </Box>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="board" className="gap-2">
            <Grid3X3 className="h-4 w-4" />
            Bed Board
          </TabsTrigger>
          <TabsTrigger value="wards" className="gap-2">
            <Bed className="h-4 w-4" />
            Wards
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <Box className="mt-4">
          <TabsContent value="board">
            <BedBoard onBedSelect={handleBedSelect} />
          </TabsContent>

          <TabsContent value="wards">
            <WardList />
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Bed Allocation History
                </CardTitle>
                <CardDescription>
                  View historical bed allocation and patient movements
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyData?.history && historyData.history.length > 0 ? (
                  <Box className="space-y-3">
                    {historyData.history.map(
                      (entry: {
                        action: string;
                        bedCode: string;
                        patientId: string;
                        wardName: string;
                        timestamp: string;
                      }) => (
                        <Box
                          key={`${entry.bedCode}-${entry.timestamp}`}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <Flex align="center" gap="md">
                            <Box className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                              {entry.action === "allocated" ? (
                                <User className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Bed className="h-4 w-4 text-gray-600" />
                              )}
                            </Box>
                            <Box>
                              <p className="font-medium">
                                {entry.bedCode} -{" "}
                                {entry.action === "allocated" ? "Allocated" : "Vacated"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Patient: {entry.patientId} | {entry.wardName}
                              </p>
                            </Box>
                          </Flex>
                          <Box className="text-right text-sm text-muted-foreground">
                            <Flex align="center" gap="sm">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                            </Flex>
                            <p>{new Date(entry.timestamp).toLocaleTimeString()}</p>
                          </Box>
                        </Box>
                      )
                    )}
                  </Box>
                ) : (
                  <Box className="text-center text-muted-foreground py-8">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No allocation history available</p>
                  </Box>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Bed Management Settings
                </CardTitle>
                <CardDescription>
                  Configure bed types, ward assignments, and housekeeping rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Box className="space-y-4">
                  <Box>
                    <h3 className="font-medium mb-3">Bed Types</h3>
                    <Box className="flex flex-wrap gap-2">
                      {["general", "icu", "isolation", "pediatric", "maternity", "bariatric"].map(
                        (type) => (
                          <Badge key={type} variant="outline" className="px-3 py-1">
                            {type.toUpperCase()}
                          </Badge>
                        )
                      )}
                    </Box>
                  </Box>
                  <Box>
                    <h3 className="font-medium mb-3">Housekeeping Rules</h3>
                    <Box className="grid grid-cols-2 gap-4 text-sm">
                      <Box className="p-3 border rounded">
                        <p className="font-medium">Cleaning Duration</p>
                        <p className="text-muted-foreground">30 minutes (standard)</p>
                      </Box>
                      <Box className="p-3 border rounded">
                        <p className="font-medium">Terminal Clean</p>
                        <p className="text-muted-foreground">60 minutes (isolation)</p>
                      </Box>
                      <Box className="p-3 border rounded">
                        <p className="font-medium">Inspection Required</p>
                        <p className="text-muted-foreground">Post-discharge only</p>
                      </Box>
                      <Box className="p-3 border rounded">
                        <p className="font-medium">Maintenance Check</p>
                        <p className="text-muted-foreground">Weekly schedule</p>
                      </Box>
                    </Box>
                  </Box>
                  <Box>
                    <h3 className="font-medium mb-3">Bed Status Workflow</h3>
                    <Box className="space-y-2">
                      <Flex align="center" gap="sm" className="text-sm">
                        <Badge variant="default">Vacant</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="secondary">Cleaning</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="default">Available</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="destructive">Occupied</Badge>
                      </Flex>
                      <Flex align="center" gap="sm" className="text-sm">
                        <Badge variant="destructive">Occupied</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="secondary">Cleaning</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="default">Vacant</Badge>
                      </Flex>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </TabsContent>
        </Box>
      </Tabs>

      {/* Add Bed Dialog */}
      <Dialog open={showAddBed} onOpenChange={setShowAddBed}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Bed</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBed} className="space-y-4">
            <Box className="grid grid-cols-2 gap-4">
              <Box className="space-y-2">
                <Label htmlFor="bedCode">Bed Code *</Label>
                <Input
                  id="bedCode"
                  value={bedCode}
                  onChange={(e) => setBedCode(e.target.value)}
                  placeholder="e.g., W1-B01"
                  required={true}
                />
              </Box>
              <Box className="space-y-2">
                <Label htmlFor="wardId">Ward ID *</Label>
                <Input
                  id="wardId"
                  value={wardId}
                  onChange={(e) => setWardId(e.target.value)}
                  placeholder="Enter ward ID..."
                  required={true}
                />
              </Box>
            </Box>
            <Box className="space-y-2">
              <Label htmlFor="bedType">Bed Type *</Label>
              <Select value={bedType} onValueChange={setBedType}>
                <SelectTrigger id="bedType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="icu">ICU</SelectItem>
                  <SelectItem value="isolation">Isolation</SelectItem>
                  <SelectItem value="pediatric">Pediatric</SelectItem>
                  <SelectItem value="maternity">Maternity</SelectItem>
                  <SelectItem value="bariatric">Bariatric</SelectItem>
                </SelectContent>
              </Select>
            </Box>
            <Box className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Room 101, Near Nursing Station"
              />
            </Box>
            <Flex gap="sm" justify="end">
              <Button type="button" variant="outline" onClick={() => setShowAddBed(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBedMutation.isPending}>
                {createBedMutation.isPending ? "Creating..." : "Create Bed"}
              </Button>
            </Flex>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bed Details Dialog */}
      <Dialog open={!!selectedBed} onOpenChange={(open) => !open && setSelectedBed(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bed Details</DialogTitle>
          </DialogHeader>
          {selectedBed && (
            <Box className="space-y-4">
              <Flex align="center" justify="between">
                <Box>
                  <p className="text-lg font-bold">{selectedBed.bedCode}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBed.bedType.replace("_", " ")}
                  </p>
                </Box>
                <Badge
                  variant={
                    selectedBed.status === "vacant"
                      ? "default"
                      : selectedBed.status === "occupied"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {selectedBed.status.charAt(0).toUpperCase() + selectedBed.status.slice(1)}
                </Badge>
              </Flex>

              {selectedBed.status === "vacant" && <Button className="w-full">Allocate Bed</Button>}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

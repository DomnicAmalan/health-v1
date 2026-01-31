/**
 * Beds Page
 * Bed management with visual bed board and allocation
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import {
  Box,
  Badge,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bed,
  Grid3X3,
  History,
  Plus,
  Settings,
  RefreshCw,
} from "lucide-react";
import { useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { BedBoard, WardList, DepartmentStats } from "@/components/departments";
import { useBedOccupancy } from "@/hooks/api/departments";
import type { Bed as BedType } from "@lazarus-life/shared/types/departments";

export const Route = createFileRoute("/beds")({
  component: BedsComponent,
});

function BedsComponent() {
  return (
    <ProtectedRoute
      requiredPermission={PERMISSIONS.DEPARTMENTS.BEDS_VIEW}
      resource="beds"
    >
      <BedsPageInner />
    </ProtectedRoute>
  );
}

function BedsPageInner() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("board");
  const [showAddBed, setShowAddBed] = useState(false);
  const [selectedBed, setSelectedBed] = useState<BedType | null>(null);

  // Get occupancy stats
  const { data: occupancyData, refetch: refetchOccupancy } = useBedOccupancy();

  const handleBedSelect = useCallback((bed: BedType) => {
    setSelectedBed(bed);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchOccupancy();
  }, [refetchOccupancy]);

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" justify="between">
        <Box>
          <h1 className="text-3xl font-bold">
            {t("beds.title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("beds.subtitle")}
          </p>
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
                <p className="text-2xl font-bold">
                  {occupancyData?.available ?? 0}
                </p>
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
                <p className="text-2xl font-bold">
                  {occupancyData?.occupied ?? 0}
                </p>
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
                <Box className="text-center text-muted-foreground py-8">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Allocation history coming soon</p>
                </Box>
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
              <CardContent>
                <Box className="text-center text-muted-foreground py-8">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Bed settings coming soon</p>
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
          <Box className="text-center text-muted-foreground py-8">
            <Bed className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Add bed form coming soon</p>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Bed Details Dialog */}
      <Dialog
        open={!!selectedBed}
        onOpenChange={(open) => !open && setSelectedBed(null)}
      >
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
                  {selectedBed.status.charAt(0).toUpperCase() +
                    selectedBed.status.slice(1)}
                </Badge>
              </Flex>

              {selectedBed.status === "vacant" && (
                <Button className="w-full">Allocate Bed</Button>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

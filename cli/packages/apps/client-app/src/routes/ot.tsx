/**
 * OT Page
 * Operating Theatre management with surgery scheduling
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
  Activity,
  Calendar,
  Clock,
  Plus,
  Scissors,
  Settings,
} from "lucide-react";
import { useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { SurgeryScheduler, DepartmentStats } from "@/components/departments";
import { useOperatingTheatres, useOTDashboard, useTodaySurgeries } from "@/hooks/api/departments";
import type { OperatingTheatre } from "@lazarus-life/shared/types/departments";

export const Route = createFileRoute("/ot")({
  component: OTComponent,
});

function OTComponent() {
  return (
    <ProtectedRoute
      requiredPermission={PERMISSIONS.DEPARTMENTS.OT_VIEW}
      resource="ot"
    >
      <OTPageInner />
    </ProtectedRoute>
  );
}

function OTPageInner() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("schedule");
  const [showSchedule, setShowSchedule] = useState(false);

  // Get OT stats
  const { data: theatresData } = useOperatingTheatres();
  const { data: dashboardData } = useOTDashboard();
  const { data: todaySurgeriesData } = useTodaySurgeries();

  const theatres = theatresData?.theatres ?? [];
  const availableOTs = theatres.filter((t: OperatingTheatre) => t.status === "available").length;
  const todaySurgeries = todaySurgeriesData?.surgeries?.length ?? 0;
  const inProgress = dashboardData?.inProgress ?? 0;
  const completed = dashboardData?.completed ?? 0;

  const _handleScheduleSuccess = useCallback(() => {
    setShowSchedule(false);
    setActiveTab("schedule");
  }, []);

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" justify="between">
        <Box>
          <h1 className="text-3xl font-bold">
            {t("ot.title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("ot.subtitle")}
          </p>
        </Box>
        <Button onClick={() => setShowSchedule(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Surgery
        </Button>
      </Flex>

      {/* Quick Stats */}
      <Box className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("theatres")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-gray-100 dark:bg-gray-900/30">
                <Scissors className="h-6 w-6 text-gray-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{theatres.length}</p>
                <p className="text-sm text-muted-foreground">Total OTs</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("theatres")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Scissors className="h-6 w-6 text-green-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{availableOTs}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("schedule")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="h-6 w-6 text-blue-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{todaySurgeries}</p>
                <p className="text-sm text-muted-foreground">Today's Surgeries</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("schedule")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Activity className="h-6 w-6 text-yellow-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("schedule")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Clock className="h-6 w-6 text-purple-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>
      </Box>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
            {todaySurgeries > 0 && (
              <Badge variant="secondary">{todaySurgeries}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="theatres" className="gap-2">
            <Scissors className="h-4 w-4" />
            Theatres
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <Activity className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <Box className="mt-4">
          <TabsContent value="schedule">
            <SurgeryScheduler />
          </TabsContent>

          <TabsContent value="theatres">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  Operating Theatres
                </CardTitle>
                <CardDescription>
                  View and manage operating theatre availability
                </CardDescription>
              </CardHeader>
              <CardContent>
                {theatres.length > 0 ? (
                  <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {theatres.map((theatre: OperatingTheatre) => (
                      <Card key={theatre.id} className="p-4">
                        <Flex align="center" justify="between" className="mb-2">
                          <p className="font-bold">{theatre.otCode}</p>
                          <Badge
                            variant={
                              theatre.status === "available"
                                ? "default"
                                : theatre.status === "in_use"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {theatre.status.replace("_", " ")}
                          </Badge>
                        </Flex>
                        <p className="text-sm text-muted-foreground">
                          {theatre.specialty.replace("_", " ")}
                        </p>
                        {theatre.hasLaminarFlow && (
                          <Badge variant="outline" className="mt-2">
                            Laminar Flow
                          </Badge>
                        )}
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Box className="text-center text-muted-foreground py-8">
                    <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No operating theatres configured</p>
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
                  OT Settings
                </CardTitle>
                <CardDescription>
                  Configure surgery scheduling rules, equipment, and team assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Box className="text-center text-muted-foreground py-8">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>OT settings coming soon</p>
                </Box>
              </CardContent>
            </Card>
          </TabsContent>
        </Box>
      </Tabs>

      {/* Schedule Surgery Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Surgery</DialogTitle>
          </DialogHeader>
          <Box className="text-center text-muted-foreground py-8">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Use the Schedule tab to add new surgeries</p>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

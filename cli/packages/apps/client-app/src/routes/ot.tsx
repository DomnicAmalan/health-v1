/**
 * OT Page
 * Operating Theatre management with surgery scheduling
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import type { OperatingTheatre } from "@lazarus-life/shared/types/departments";
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
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Calendar, Clock, Plus, Scissors, Settings } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { DepartmentStats, SurgeryScheduler } from "@/components/departments";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import {
  useOperatingTheatres,
  useOTDashboard,
  useScheduleSurgery,
  useTodaySurgeries,
} from "@/hooks/api/departments";

export const Route = createFileRoute("/ot")({
  component: OTComponent,
});

function OTComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.DEPARTMENTS.OT_VIEW} resource="ot">
      <OTPageInner />
    </ProtectedRoute>
  );
}

function OTPageInner() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("schedule");
  const [showSchedule, setShowSchedule] = useState(false);

  // Form state
  const [patientId, setPatientId] = useState("");
  const [procedureName, setProcedureName] = useState("");
  const [surgeonId, setSurgeonId] = useState("");
  const [anesthesiologistId, setAnesthesiologistId] = useState("");
  const [otId, setOtId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0] ?? "");
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [estimatedDuration, setEstimatedDuration] = useState("120");
  const [notes, setNotes] = useState("");

  // Get OT stats
  const { data: theatresData } = useOperatingTheatres();
  const { data: dashboardData } = useOTDashboard();
  const { data: todaySurgeriesData } = useTodaySurgeries();
  const scheduleSurgeryMutation = useScheduleSurgery();

  const theatres = theatresData?.theatres ?? [];
  const availableOTs = theatres.filter((t: OperatingTheatre) => t.status === "available").length;
  const todaySurgeries = todaySurgeriesData?.surgeries?.length ?? 0;
  const inProgress = dashboardData?.inProgress ?? 0;
  const completed = dashboardData?.completed ?? 0;

  const handleScheduleSurgery = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await scheduleSurgeryMutation.mutateAsync({
          patientId,
          procedureName,
          surgeonId,
          anesthesiologistId: anesthesiologistId || undefined,
          otId,
          scheduledDate,
          scheduledTime,
          estimatedDuration: Number.parseInt(estimatedDuration, 10),
          notes: notes || undefined,
        });
        toast.success("Surgery scheduled successfully");
        setShowSchedule(false);
        // Reset form
        setPatientId("");
        setProcedureName("");
        setSurgeonId("");
        setAnesthesiologistId("");
        setOtId("");
        setScheduledDate(new Date().toISOString().split("T")[0] ?? "");
        setScheduledTime("08:00");
        setEstimatedDuration("120");
        setNotes("");
      } catch (_error) {
        toast.error("Failed to schedule surgery");
      }
    },
    [
      patientId,
      procedureName,
      surgeonId,
      anesthesiologistId,
      otId,
      scheduledDate,
      scheduledTime,
      estimatedDuration,
      notes,
      scheduleSurgeryMutation,
    ]
  );

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" justify="between">
        <Box>
          <h1 className="text-3xl font-bold">{t("ot.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("ot.subtitle")}</p>
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
            {todaySurgeries > 0 && <Badge variant="secondary">{todaySurgeries}</Badge>}
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
                <CardDescription>View and manage operating theatre availability</CardDescription>
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
              <CardContent className="space-y-6">
                <Box className="space-y-4">
                  <Box>
                    <h3 className="font-medium mb-3">Scheduling Rules</h3>
                    <Box className="grid grid-cols-2 gap-4 text-sm">
                      <Box className="p-3 border rounded">
                        <p className="font-medium">Working Hours</p>
                        <p className="text-muted-foreground">08:00 - 18:00</p>
                      </Box>
                      <Box className="p-3 border rounded">
                        <p className="font-medium">Turnaround Time</p>
                        <p className="text-muted-foreground">30 minutes</p>
                      </Box>
                      <Box className="p-3 border rounded">
                        <p className="font-medium">Max Daily Surgeries</p>
                        <p className="text-muted-foreground">6 per OT</p>
                      </Box>
                      <Box className="p-3 border rounded">
                        <p className="font-medium">Emergency Slot</p>
                        <p className="text-muted-foreground">Always reserved</p>
                      </Box>
                    </Box>
                  </Box>
                  <Box>
                    <h3 className="font-medium mb-3">OT Specialties</h3>
                    <Box className="flex flex-wrap gap-2">
                      {[
                        "general",
                        "cardiac",
                        "neuro",
                        "orthopedic",
                        "pediatric",
                        "transplant",
                        "emergency",
                      ].map((spec) => (
                        <Badge key={spec} variant="outline" className="px-3 py-1">
                          {spec.toUpperCase()}
                        </Badge>
                      ))}
                    </Box>
                  </Box>
                  <Box>
                    <h3 className="font-medium mb-3">Required Team Members</h3>
                    <Box className="space-y-2 text-sm">
                      <Box className="flex items-center justify-between p-2 border rounded">
                        <span>Surgeon</span>
                        <Badge>Required</Badge>
                      </Box>
                      <Box className="flex items-center justify-between p-2 border rounded">
                        <span>Anesthesiologist</span>
                        <Badge>Required</Badge>
                      </Box>
                      <Box className="flex items-center justify-between p-2 border rounded">
                        <span>Scrub Nurse</span>
                        <Badge variant="secondary">Optional</Badge>
                      </Box>
                      <Box className="flex items-center justify-between p-2 border rounded">
                        <span>Anesthesia Technician</span>
                        <Badge variant="secondary">Optional</Badge>
                      </Box>
                    </Box>
                  </Box>
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
          <form onSubmit={handleScheduleSurgery} className="space-y-4">
            <Box className="grid grid-cols-2 gap-4">
              <Box className="space-y-2">
                <Label htmlFor="patientId">Patient ID *</Label>
                <Input
                  id="patientId"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="Enter patient ID..."
                  required={true}
                />
              </Box>
              <Box className="space-y-2">
                <Label htmlFor="surgeonId">Surgeon ID *</Label>
                <Input
                  id="surgeonId"
                  value={surgeonId}
                  onChange={(e) => setSurgeonId(e.target.value)}
                  placeholder="Enter surgeon ID..."
                  required={true}
                />
              </Box>
            </Box>
            <Box className="space-y-2">
              <Label htmlFor="procedureName">Procedure Name *</Label>
              <Input
                id="procedureName"
                value={procedureName}
                onChange={(e) => setProcedureName(e.target.value)}
                placeholder="e.g., Appendectomy"
                required={true}
              />
            </Box>
            <Box className="grid grid-cols-2 gap-4">
              <Box className="space-y-2">
                <Label htmlFor="otId">Operating Theatre *</Label>
                <Select value={otId} onValueChange={setOtId} required={true}>
                  <SelectTrigger id="otId">
                    <SelectValue placeholder="Select OT..." />
                  </SelectTrigger>
                  <SelectContent>
                    {theatres
                      .filter((t: OperatingTheatre) => t.status === "available")
                      .map((theatre: OperatingTheatre) => (
                        <SelectItem key={theatre.id} value={theatre.id}>
                          {theatre.otCode} - {theatre.specialty}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Box>
              <Box className="space-y-2">
                <Label htmlFor="anesthesiologistId">Anesthesiologist ID</Label>
                <Input
                  id="anesthesiologistId"
                  value={anesthesiologistId}
                  onChange={(e) => setAnesthesiologistId(e.target.value)}
                  placeholder="Enter anesthesiologist ID..."
                />
              </Box>
            </Box>
            <Box className="grid grid-cols-3 gap-4">
              <Box className="space-y-2">
                <Label htmlFor="scheduledDate">Date *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required={true}
                />
              </Box>
              <Box className="space-y-2">
                <Label htmlFor="scheduledTime">Time *</Label>
                <Select value={scheduledTime} onValueChange={setScheduledTime}>
                  <SelectTrigger id="scheduledTime">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "08:00",
                      "09:00",
                      "10:00",
                      "11:00",
                      "12:00",
                      "13:00",
                      "14:00",
                      "15:00",
                      "16:00",
                      "17:00",
                    ].map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Box>
              <Box className="space-y-2">
                <Label htmlFor="estimatedDuration">Duration (mins) *</Label>
                <Input
                  id="estimatedDuration"
                  type="number"
                  min="30"
                  step="30"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  required={true}
                />
              </Box>
            </Box>
            <Box className="space-y-2">
              <Label htmlFor="notes">Pre-operative Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requirements or notes..."
                rows={3}
              />
            </Box>
            <Flex gap="sm" justify="end">
              <Button type="button" variant="outline" onClick={() => setShowSchedule(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={scheduleSurgeryMutation.isPending}>
                {scheduleSurgeryMutation.isPending ? "Scheduling..." : "Schedule Surgery"}
              </Button>
            </Flex>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

/**
 * Scheduling Page
 * Appointment management with today's schedule, checked-in patients, and all appointments
 */

import { useState, useCallback } from "react";
import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import type { EhrAppointment } from "@lazarus-life/shared/types/ehr";
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
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
  Calendar,
  Clock,
  LogIn,
  Plus,
  UserX,
  XCircle,
} from "lucide-react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import {
  useEhrTodayAppointments,
  useEhrCheckedInAppointments,
  useCheckInEhrAppointment,
  useCancelEhrAppointment,
  useNoShowEhrAppointment,
} from "@/hooks/api/ehr/useEhrAppointments";

export const Route = createFileRoute("/scheduling")({
  component: SchedulingComponent,
});

function SchedulingComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.SCHEDULING.VIEW} resource="scheduling">
      <SchedulingPageInner />
    </ProtectedRoute>
  );
}

function SchedulingPageInner() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("today");
  const [selectedAppointment, setSelectedAppointment] = useState<EhrAppointment | null>(null);

  // Data hooks
  const { data: todayData, isLoading: todayLoading } = useEhrTodayAppointments();
  const { data: checkedInData, isLoading: checkedInLoading } = useEhrCheckedInAppointments();

  const todayAppointments = Array.isArray(todayData) ? todayData : [];
  const checkedInAppointments = Array.isArray(checkedInData) ? checkedInData : [];
  const noShowCount = todayAppointments.filter((a) => a.status === "no_show").length;

  // Mutations
  const checkIn = useCheckInEhrAppointment();
  const cancel = useCancelEhrAppointment();
  const noShow = useNoShowEhrAppointment();

  const handleCheckIn = useCallback(
    async (id: string) => {
      await checkIn.mutateAsync(id);
    },
    [checkIn],
  );

  const handleCancel = useCallback(
    async (id: string) => {
      await cancel.mutateAsync({ id, reason: "Cancelled by staff" });
    },
    [cancel],
  );

  const handleNoShow = useCallback(
    async (id: string) => {
      await noShow.mutateAsync(id);
    },
    [noShow],
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "checked_in":
        return <Badge className="bg-green-600">Checked In</Badge>;
      case "in_progress":
        return <Badge variant="default">In Progress</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      case "no_show":
        return <Badge variant="destructive">No Show</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" justify="between">
        <Box>
          <h1 className="text-3xl font-bold">{t("scheduling.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("scheduling.subtitle")}</p>
        </Box>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("quickActions.scheduleAppointment")}
        </Button>
      </Flex>

      {/* Stats Cards */}
      <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("today")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="h-6 w-6 text-blue-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{todayAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Today's Appointments</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("checked-in")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <LogIn className="h-6 w-6 text-green-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{checkedInAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Checked In</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <UserX className="h-6 w-6 text-red-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{noShowCount}</p>
                <p className="text-sm text-muted-foreground">No Shows</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today" className="gap-2">
            <Calendar className="h-4 w-4" />
            Today
            {todayAppointments.length > 0 && (
              <Badge variant="secondary">{todayAppointments.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="checked-in" className="gap-2">
            <LogIn className="h-4 w-4" />
            Checked In
            {checkedInAppointments.length > 0 && (
              <Badge variant="secondary">{checkedInAppointments.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <Clock className="h-4 w-4" />
            All
          </TabsTrigger>
        </TabsList>

        <Box className="mt-4">
          {/* Today Tab */}
          <TabsContent value="today">
            {todayLoading ? (
              <Box className="text-center py-8 text-muted-foreground">Loading today's appointments...</Box>
            ) : todayAppointments.length === 0 ? (
              <Box className="text-center py-12 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No appointments today</p>
              </Box>
            ) : (
              <AppointmentList
                appointments={todayAppointments}
                onSelect={setSelectedAppointment}
                getStatusBadge={getStatusBadge}
                onCheckIn={handleCheckIn}
              />
            )}
          </TabsContent>

          {/* Checked In Tab */}
          <TabsContent value="checked-in">
            {checkedInLoading ? (
              <Box className="text-center py-8 text-muted-foreground">Loading checked-in patients...</Box>
            ) : checkedInAppointments.length === 0 ? (
              <Box className="text-center py-12 text-muted-foreground">
                <LogIn className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No checked-in patients</p>
              </Box>
            ) : (
              <AppointmentList
                appointments={checkedInAppointments}
                onSelect={setSelectedAppointment}
                getStatusBadge={getStatusBadge}
                onCheckIn={handleCheckIn}
              />
            )}
          </TabsContent>

          {/* All Tab */}
          <TabsContent value="all">
            <Box className="text-center py-12 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a date range or provider to view all appointments</p>
            </Box>
          </TabsContent>
        </Box>
      </Tabs>

      {/* Appointment Detail Dialog */}
      <Dialog
        open={!!selectedAppointment}
        onOpenChange={(open: boolean) => !open && setSelectedAppointment(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <Box className="space-y-4">
              <Box className="grid grid-cols-2 gap-4 text-sm">
                <Box>
                  <span className="text-muted-foreground">Patient</span>
                  <p className="font-medium">{selectedAppointment.patientId}</p>
                </Box>
                <Box>
                  <span className="text-muted-foreground">Status</span>
                  <Box className="mt-1">{getStatusBadge(selectedAppointment.status)}</Box>
                </Box>
                {selectedAppointment.providerId && (
                  <Box>
                    <span className="text-muted-foreground">Provider</span>
                    <p>{selectedAppointment.providerId}</p>
                  </Box>
                )}
                {selectedAppointment.locationId && (
                  <Box>
                    <span className="text-muted-foreground">Location</span>
                    <p>{selectedAppointment.locationId}</p>
                  </Box>
                )}
                {selectedAppointment.appointmentType && (
                  <Box>
                    <span className="text-muted-foreground">Type</span>
                    <p className="capitalize">{selectedAppointment.appointmentType}</p>
                  </Box>
                )}
                {selectedAppointment.scheduledDatetime && (
                  <Box>
                    <span className="text-muted-foreground">Time</span>
                    <p>{new Date(selectedAppointment.scheduledDatetime).toLocaleTimeString()}</p>
                  </Box>
                )}
                {selectedAppointment.durationMinutes && (
                  <Box>
                    <span className="text-muted-foreground">Duration</span>
                    <p>{selectedAppointment.durationMinutes} min</p>
                  </Box>
                )}
              </Box>

              {selectedAppointment.reason && (
                <Box>
                  <span className="text-muted-foreground text-sm">Reason</span>
                  <p className="mt-1">{selectedAppointment.reason}</p>
                </Box>
              )}

              <Flex gap="sm" className="pt-2">
                {selectedAppointment.status === "scheduled" && (
                  <>
                    <Button size="sm" onClick={() => handleCheckIn(selectedAppointment.id)}>
                      <LogIn className="h-4 w-4 mr-1" />
                      Check In
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleNoShow(selectedAppointment.id)}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      No Show
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancel(selectedAppointment.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                )}
              </Flex>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function AppointmentList({
  appointments,
  onSelect,
  getStatusBadge,
  onCheckIn,
}: {
  appointments: EhrAppointment[];
  onSelect: (appointment: EhrAppointment) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  onCheckIn: (id: string) => void;
}) {
  return (
    <Box className="space-y-2">
      {appointments.map((appt) => (
        <Card
          key={appt.id}
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onSelect(appt)}
        >
          <CardContent className="flex items-center justify-between p-4">
            <Flex align="center" gap="md" className="flex-1">
              <Box className="p-2 rounded-lg bg-muted">
                <Calendar className="h-4 w-4" />
              </Box>
              <Box>
                <p className="font-medium">Patient: {appt.patientId}</p>
                <p className="text-sm text-muted-foreground">
                  {appt.scheduledDatetime && new Date(appt.scheduledDatetime).toLocaleTimeString()}
                  {appt.durationMinutes && <> &middot; {appt.durationMinutes} min</>}
                  {appt.appointmentType && <> &middot; {appt.appointmentType}</>}
                </p>
              </Box>
            </Flex>
            <Flex align="center" gap="sm">
              {getStatusBadge(appt.status)}
              {appt.status === "scheduled" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onCheckIn(appt.id);
                  }}
                >
                  <LogIn className="h-3 w-3 mr-1" />
                  Check In
                </Button>
              )}
            </Flex>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

/**
 * AppointmentList Component
 * Displays patient's scheduled appointments
 */

import type { EhrAppointment } from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
} from "@lazarus-life/ui-components";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className || ""}`} />
);
import { cn } from "@lazarus-life/ui-components/utils";
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CalendarX,
  CheckCircle,
  Clock,
  MapPin,
  Plus,
  User,
  XCircle,
} from "lucide-react";
import { memo } from "react";
import { useEhrPatientAppointments } from "@/hooks/api/ehr";

interface AppointmentListProps {
  patientId: string;
  onAddAppointment?: () => void;
  onSelectAppointment?: (appointment: EhrAppointment) => void;
  onCheckIn?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
  showPast?: boolean;
  compact?: boolean;
  className?: string;
  limit?: number;
}

function formatDateFromDatetime(datetimeString: string): string {
  const date = new Date(datetimeString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeFromDatetime(datetimeString: string): string {
  const date = new Date(datetimeString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function AppointmentStatusBadge({ status }: { status: EhrAppointment["status"] }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle; label: string }> = {
    scheduled: { variant: "outline", icon: Calendar, label: "Scheduled" },
    confirmed: { variant: "secondary", icon: CalendarCheck, label: "Confirmed" },
    checked_in: { variant: "default", icon: CheckCircle, label: "Checked In" },
    in_room: { variant: "default", icon: Clock, label: "In Room" },
    completed: { variant: "secondary", icon: CheckCircle, label: "Completed" },
    cancelled: { variant: "destructive", icon: CalendarX, label: "Cancelled" },
    no_show: { variant: "destructive", icon: XCircle, label: "No Show" },
    rescheduled: { variant: "outline", icon: Calendar, label: "Rescheduled" },
  };

  const statusConfig = config[status] || { variant: "outline" as const, icon: Calendar, label: status };
  const Icon = statusConfig.icon;

  return (
    <Badge variant={statusConfig.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  );
}

function AppointmentTypeLabel({ appointmentType }: { appointmentType: string }) {
  const labels: Record<string, string> = {
    new_patient: "New Patient",
    follow_up: "Follow-up",
    annual_exam: "Annual Exam",
    urgent: "Urgent",
    telehealth: "Telehealth",
    procedure: "Procedure",
    lab: "Lab",
    other: "Other",
  };
  return <span>{labels[appointmentType] || appointmentType}</span>;
}

interface AppointmentItemProps {
  appointment: EhrAppointment;
  onSelect?: (appointment: EhrAppointment) => void;
  onCheckIn?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
  compact?: boolean;
}

const AppointmentItem = memo(function AppointmentItem({
  appointment,
  onSelect,
  onCheckIn,
  onCancel,
  compact,
}: AppointmentItemProps) {
  const isUpcoming = appointment.status === "scheduled" || appointment.status === "confirmed";
  const apptDate = new Date(appointment.scheduledDatetime);
  const isToday = apptDate.toDateString() === new Date().toDateString();
  const canCheckIn = isUpcoming && isToday;

  return (
    <Box
      className={cn(
        "border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer",
        isToday && isUpcoming && "border-primary/50 bg-primary/5",
        appointment.appointmentType === "urgent" && isUpcoming && "border-destructive/50"
      )}
      onClick={() => onSelect?.(appointment)}
    >
      <Flex align="start" gap="sm">
        <Calendar className={cn(
          "h-4 w-4 mt-0.5",
          isToday && isUpcoming ? "text-primary" : "text-muted-foreground"
        )} />
        <Box className="flex-1 min-w-0">
          <Flex align="center" gap="sm" className="mb-1">
            <span className="font-medium">
              <AppointmentTypeLabel appointmentType={appointment.appointmentType} />
            </span>
            <AppointmentStatusBadge status={appointment.status} />
          </Flex>

          <Flex gap="md" className="text-sm text-muted-foreground">
            <Flex align="center" gap="xs">
              <Clock className="h-3 w-3" />
              <span className={cn(isToday && isUpcoming && "text-primary font-medium")}>
                {formatDateFromDatetime(appointment.scheduledDatetime)} at {formatTimeFromDatetime(appointment.scheduledDatetime)}
              </span>
            </Flex>
          </Flex>

          {!compact && (
            <>
              {appointment.providerName && (
                <Flex align="center" gap="xs" className="text-sm text-muted-foreground mt-1">
                  <User className="h-3 w-3" />
                  <span>{appointment.providerName}</span>
                </Flex>
              )}

              {appointment.locationName && (
                <Flex align="center" gap="xs" className="text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{appointment.locationName}</span>
                </Flex>
              )}

              {appointment.reason && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  "{appointment.reason}"
                </p>
              )}

              {(canCheckIn || (isUpcoming && onCancel)) && (
                <Flex gap="sm" className="mt-2">
                  {canCheckIn && onCheckIn && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCheckIn(appointment.id);
                      }}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Check In
                    </Button>
                  )}
                  {isUpcoming && onCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel(appointment.id);
                      }}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                </Flex>
              )}
            </>
          )}
        </Box>
      </Flex>
    </Box>
  );
});

export const AppointmentList = memo(function AppointmentList({
  patientId,
  onAddAppointment,
  onSelectAppointment,
  onCheckIn,
  onCancel,
  showPast = false,
  compact = false,
  className,
  limit = 10,
}: AppointmentListProps) {
  const { data, isLoading, error } = useEhrPatientAppointments(patientId, { limit, offset: 0 });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load appointments</p>
          </Box>
        </CardContent>
      </Card>
    );
  }

  let appointments = data?.items ?? [];

  // Filter out past appointments unless showPast is true
  if (!showPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointments = appointments.filter((a) => {
      const apptDate = new Date(a.scheduledDatetime);
      return apptDate >= today || a.status === "checked_in" || a.status === "in_room";
    });
  }

  const upcomingToday = appointments.filter((a) => {
    const isToday = new Date(a.scheduledDatetime).toDateString() === new Date().toDateString();
    return isToday && (a.status === "scheduled" || a.status === "confirmed");
  });

  return (
    <Card className={className}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointments
            {upcomingToday.length > 0 && (
              <Badge variant="default">{upcomingToday.length} today</Badge>
            )}
          </CardTitle>
          {onAddAppointment && (
            <Button variant="outline" size="sm" onClick={onAddAppointment}>
              <Plus className="h-4 w-4 mr-1" />
              Schedule
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <Box className="text-center text-muted-foreground py-8">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No upcoming appointments</p>
          </Box>
        ) : (
          <Box className="space-y-2">
            {appointments.map((appointment) => (
              <AppointmentItem
                key={appointment.id}
                appointment={appointment}
                onSelect={onSelectAppointment}
                onCheckIn={onCheckIn}
                onCancel={onCancel}
                compact={compact}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Appointments List Component
 * Displays patient appointments with status indicators
 */

import {
  Box,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@lazarus-life/ui-components";
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format, isPast, isFuture, isToday } from "date-fns";
import { useEhrPatientAppointments } from "@/hooks/api/ehr/useEhrAppointments";

interface AppointmentsListProps {
  patientId: string;
}

const STATUS_CONFIG = {
  SCHEDULED: {
    label: "Scheduled",
    variant: "default" as const,
    icon: Calendar,
  },
  CHECKED_IN: {
    label: "Checked In",
    variant: "secondary" as const,
    icon: CheckCircle,
  },
  COMPLETED: {
    label: "Completed",
    variant: "success" as const,
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    variant: "destructive" as const,
    icon: XCircle,
  },
  NO_SHOW: {
    label: "No Show",
    variant: "destructive" as const,
    icon: AlertCircle,
  },
} as const;

export function AppointmentsList({ patientId }: AppointmentsListProps) {
  const { data: appointments, isLoading } = useEhrPatientAppointments(patientId);

  // Extract array from response (handle both array and paginated format)
  const appointmentList = Array.isArray(appointments) ? appointments : (appointments?.items || []);

  if (isLoading) {
    return (
      <Box className="text-center py-12 text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p>Loading appointments...</p>
      </Box>
    );
  }

  if (appointmentList.length === 0) {
    return (
      <Box className="text-center py-12 text-muted-foreground border rounded-lg">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No appointments found</p>
        <p className="text-sm mt-2">Schedule a new appointment to get started</p>
      </Box>
    );
  }

  // Group appointments by time period
  const upcomingAppointments = appointmentList.filter(
    (apt) => (apt.status === "SCHEDULED" || apt.status === "CHECKED_IN") && isFuture(new Date(apt.appointmentDate))
  );
  const todayAppointments = appointmentList.filter((apt) => isToday(new Date(apt.appointmentDate)));
  const pastAppointments = appointmentList.filter((apt) => isPast(new Date(apt.appointmentDate)) && apt.status === "COMPLETED");

  return (
    <Box className="space-y-6">
      {/* Today's Appointments */}
      {todayAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Today's Appointments
          </h3>
          <div className="space-y-3">
            {todayAppointments.map((appointment) => (
              <AppointmentCard key={appointment.ien} appointment={appointment} highlight />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Upcoming Appointments</h3>
          <div className="space-y-3">
            {upcomingAppointments.map((appointment) => (
              <AppointmentCard key={appointment.ien} appointment={appointment} />
            ))}
          </div>
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Past Appointments</h3>
          <div className="space-y-3">
            {pastAppointments.slice(0, 5).map((appointment) => (
              <AppointmentCard key={appointment.ien} appointment={appointment} />
            ))}
          </div>
          {pastAppointments.length > 5 && (
            <p className="text-sm text-muted-foreground mt-3">
              Showing 5 of {pastAppointments.length} past appointments
            </p>
          )}
        </div>
      )}
    </Box>
  );
}

function AppointmentCard({
  appointment,
  highlight = false,
}: {
  appointment: any;
  highlight?: boolean;
}) {
  const statusConfig = STATUS_CONFIG[appointment.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.SCHEDULED;
  const StatusIcon = statusConfig.icon;
  const appointmentDate = new Date(appointment.appointmentDate);

  return (
    <Card className={highlight ? "border-primary shadow-md" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">
              {appointment.appointmentType}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(appointmentDate, "EEE, MMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {appointment.appointmentTime || "Not specified"}
              </span>
            </CardDescription>
          </div>
          <Badge variant={statusConfig.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {appointment.providerIen && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Provider: #{appointment.providerIen}</span>
            </div>
          )}
          {appointment.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{appointment.location}</span>
            </div>
          )}
          {appointment.durationMinutes && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{appointment.durationMinutes} minutes</span>
            </div>
          )}
          {appointment.reason && (
            <div className="col-span-2 mt-2 p-3 bg-muted rounded-md">
              <div className="text-xs font-medium text-muted-foreground mb-1">Reason</div>
              <div>{appointment.reason}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

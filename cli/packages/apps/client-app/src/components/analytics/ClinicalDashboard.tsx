/**
 * Clinical Dashboard Component
 * Overview of patient census, appointments, TAT metrics, and alerts
 */

import { memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Progress,
} from "@lazarus-life/ui-components";
import {
  Users,
  Bed,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  CheckCircle,
} from "lucide-react";
import type {
  PatientCensus,
  DepartmentStats,
  TATMetrics,
  AppointmentStats,
  ClinicalAlert,
} from "@lazarus-life/shared";

interface ClinicalDashboardProps {
  census?: PatientCensus;
  departmentStats?: DepartmentStats[];
  tatMetrics?: TATMetrics;
  appointmentStats?: AppointmentStats;
  alerts?: ClinicalAlert[];
  onAcknowledgeAlert?: (alertId: string) => void;
  isLoading?: boolean;
}

export const ClinicalDashboard = memo(function ClinicalDashboard({
  census,
  departmentStats,
  tatMetrics,
  appointmentStats,
  alerts,
  onAcknowledgeAlert,
  isLoading = false,
}: ClinicalDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading clinical dashboard...</p>
      </div>
    );
  }

  const unacknowledgedAlerts = alerts?.filter((a) => !a.acknowledged) || [];

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Critical Alerts ({unacknowledgedAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unacknowledgedAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-md bg-white p-3"
                >
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-muted-foreground">
                      Patient: {alert.patientName} | {alert.type.replace("_", " ")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAcknowledgeAlert?.(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient Census */}
      {census && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{census.totalPatients}</div>
              <p className="text-xs text-muted-foreground">
                +{census.newAdmissionsToday} new today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inpatients</CardTitle>
              <Bed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{census.inpatients}</div>
              <p className="text-xs text-muted-foreground">
                {census.pendingDischarges} pending discharge
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outpatients</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{census.outpatients}</div>
              <p className="text-xs text-muted-foreground">Today's OPD visits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emergency</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{census.emergencyPatients}</div>
              <p className="text-xs text-muted-foreground">
                ICU: {census.icuPatients}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Appointments & TAT */}
      <div className="grid grid-cols-2 gap-6">
        {/* Appointment Stats */}
        {appointmentStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{appointmentStats.totalScheduled}</p>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {appointmentStats.completed}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{appointmentStats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Slot Utilization</span>
                  <span>{appointmentStats.slotUtilization}%</span>
                </div>
                <Progress value={appointmentStats.slotUtilization} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="font-medium text-red-600">{appointmentStats.noShow}</p>
                  <p className="text-muted-foreground">No Shows</p>
                </div>
                <div>
                  <p className="font-medium text-amber-600">{appointmentStats.cancelled}</p>
                  <p className="text-muted-foreground">Cancelled</p>
                </div>
                <div>
                  <p className="font-medium">{appointmentStats.averageWaitTime} min</p>
                  <p className="text-muted-foreground">Avg Wait</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAT Metrics */}
        {tatMetrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Turn Around Time (TAT)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(tatMetrics).map(([key, tat]) => {
                if (!tat || typeof tat !== "object") return null;
                const detail = tat as {
                  category: string;
                  averageTime: number;
                  targetTime: number;
                  withinTarget: number;
                  trend: string;
                };
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">
                        {detail.category || key.replace("TAT", "")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {detail.averageTime} / {detail.targetTime} min
                        </span>
                        {detail.trend === "improving" ? (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        ) : detail.trend === "declining" ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={detail.withinTarget}
                        className={
                          detail.withinTarget >= 80
                            ? "[&>div]:bg-green-500"
                            : detail.withinTarget >= 60
                              ? "[&>div]:bg-amber-500"
                              : "[&>div]:bg-red-500"
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {detail.withinTarget}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Department Stats */}
      {departmentStats && departmentStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Department Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {departmentStats.slice(0, 6).map((dept) => (
                <Card key={dept.departmentId}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{dept.departmentName}</p>
                        <p className="text-sm text-muted-foreground">
                          {dept.patientsWaiting} waiting | {dept.patientsInConsultation} in
                          consult
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{dept.completedToday}</p>
                        <p className="text-xs text-muted-foreground">completed</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3" />
                      <span>Avg wait: {dept.averageWaitTime} min</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

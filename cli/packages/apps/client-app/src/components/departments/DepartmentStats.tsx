/**
 * DepartmentStats Component
 * Dashboard overview of all department statistics
 */

import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Progress,
  Skeleton,
} from "@lazarus-life/ui-components";
import {
  useBedOccupancy,
  useAllWardsCensus,
  useOPDDashboard,
  useIPDDashboard,
  useOTDashboard,
} from "@/hooks/api/departments";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  trend?: { value: number; isPositive: boolean };
  color?: "default" | "success" | "warning" | "danger";
}

const StatCard = memo(function StatCard({
  title,
  value,
  description,
  trend,
  color = "default",
}: StatCardProps) {
  const colorClasses = {
    default: "text-foreground",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {trend && (
            <Badge variant={trend.isPositive ? "default" : "destructive"}>
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </Badge>
          )}
        </div>
        <div className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
});

interface OccupancyBarProps {
  label: string;
  occupied: number;
  total: number;
}

const OccupancyBar = memo(function OccupancyBar({
  label,
  occupied,
  total,
}: OccupancyBarProps) {
  const rate = total > 0 ? (occupied / total) * 100 : 0;
  const getColor = (r: number) => {
    if (r < 60) return "bg-green-500";
    if (r < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {occupied}/{total} ({rate.toFixed(0)}%)
        </span>
      </div>
      <Progress value={rate} className="h-2" indicatorClassName={getColor(rate)} />
    </div>
  );
});

export const DepartmentStats = memo(function DepartmentStats() {
  const { data: bedOccupancy, isLoading: bedsLoading } = useBedOccupancy();
  const { data: wardsCensus, isLoading: wardsLoading } = useAllWardsCensus();
  const { data: opdDashboard, isLoading: opdLoading } = useOPDDashboard();
  const { data: ipdDashboard, isLoading: ipdLoading } = useIPDDashboard();
  const { data: otDashboard, isLoading: otLoading } = useOTDashboard();

  const isLoading = bedsLoading || wardsLoading || opdLoading || ipdLoading || otLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={`stat-skeleton-${i}`} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Beds"
            value={bedOccupancy?.total ?? 0}
            description="Hospital capacity"
          />
          <StatCard
            title="Available Beds"
            value={bedOccupancy?.available ?? 0}
            description="Ready for admission"
            color="success"
          />
          <StatCard
            title="Occupancy Rate"
            value={`${bedOccupancy?.occupancyRate?.toFixed(1) ?? 0}%`}
            description="Current utilization"
            color={
              (bedOccupancy?.occupancyRate ?? 0) > 80
                ? "danger"
                : (bedOccupancy?.occupancyRate ?? 0) > 60
                ? "warning"
                : "success"
            }
          />
          <StatCard
            title="Total Wards"
            value={wardsCensus?.wards?.length ?? 0}
            description="Active wards"
          />
        </div>
      </div>

      {/* OPD Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Outpatient Department (OPD)</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Today's Registrations"
            value={opdDashboard?.today?.totalRegistered ?? 0}
            description="Total check-ins"
          />
          <StatCard
            title="Waiting"
            value={opdDashboard?.today?.waiting ?? 0}
            description="In queue"
            color="warning"
          />
          <StatCard
            title="In Consultation"
            value={opdDashboard?.today?.inConsultation ?? 0}
            description="Being seen"
            color="success"
          />
          <StatCard
            title="Completed"
            value={opdDashboard?.today?.completed ?? 0}
            description="Visits completed"
            color="success"
          />
          <StatCard
            title="Avg Wait Time"
            value={`${opdDashboard?.today?.averageWaitTime ?? 0} min`}
            description="Average wait"
            color={
              (opdDashboard?.today?.averageWaitTime ?? 0) > 30 ? "danger" : "default"
            }
          />
        </div>
      </div>

      {/* IPD Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Inpatient Department (IPD)</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Current Admissions"
            value={ipdDashboard?.currentAdmissions ?? 0}
            description="Active patients"
          />
          <StatCard
            title="Today's Admissions"
            value={ipdDashboard?.todayAdmissions ?? 0}
            description="New today"
          />
          <StatCard
            title="Today's Discharges"
            value={ipdDashboard?.todayDischarges ?? 0}
            description="Released today"
          />
          <StatCard
            title="Pending Discharges"
            value={ipdDashboard?.pendingDischarges?.length ?? 0}
            description="Awaiting discharge"
            color="warning"
          />
          <StatCard
            title="Avg Length of Stay"
            value={`${ipdDashboard?.averageLOS?.toFixed(1) ?? 0} days`}
            description="Average stay"
          />
        </div>
      </div>

      {/* OT Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Operating Theatre (OT)</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Total OTs"
            value={otDashboard?.totalTheatres ?? 0}
            description="Operating theatres"
          />
          <StatCard
            title="Available OTs"
            value={otDashboard?.availableTheatres ?? 0}
            description="Ready for surgery"
            color="success"
          />
          <StatCard
            title="Today's Surgeries"
            value={otDashboard?.todaySurgeries ?? 0}
            description="Scheduled today"
          />
          <StatCard
            title="In Progress"
            value={otDashboard?.inProgress ?? 0}
            description="Currently running"
            color="warning"
          />
          <StatCard
            title="Completed"
            value={otDashboard?.completed ?? 0}
            description="Finished today"
            color="success"
          />
        </div>
      </div>

      {/* Ward Occupancy */}
      <Card>
        <CardHeader>
          <CardTitle>Ward Occupancy</CardTitle>
          <CardDescription>
            Bed utilization by ward
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {wardsCensus?.wards?.map((ward) => (
              <OccupancyBar
                key={ward.wardId}
                label={ward.wardName}
                occupied={ward.occupied}
                total={ward.occupied + ward.available}
              />
            )) ?? (
              <p className="text-muted-foreground text-center py-4">
                No ward data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default DepartmentStats;

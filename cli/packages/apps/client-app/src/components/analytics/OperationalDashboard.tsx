/**
 * Operational Dashboard Component
 * Overview of bed occupancy, resources, staff, queues, and inventory
 */

import { memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Progress,
} from "@lazarus-life/ui-components";
import {
  Bed,
  Users,
  Clock,
  AlertTriangle,
  Package,
  Activity,
  Building,
  Wrench,
} from "lucide-react";
import type {
  BedOccupancy,
  BedOccupancyByWard,
  ResourceUtilization,
  StaffOverview,
  QueueStats,
  InventoryOverview,
  InventoryAlert,
  EmergencyDepartmentStats,
  OperationalKPIs,
} from "@lazarus-life/shared";

interface OperationalDashboardProps {
  bedOccupancy?: BedOccupancy;
  bedOccupancyByWard?: BedOccupancyByWard[];
  resourceUtilization?: ResourceUtilization[];
  staffOverview?: StaffOverview;
  queueStats?: QueueStats[];
  inventoryOverview?: InventoryOverview;
  inventoryAlerts?: InventoryAlert[];
  emergencyStats?: EmergencyDepartmentStats;
  kpis?: OperationalKPIs;
  isLoading?: boolean;
}

export const OperationalDashboard = memo(function OperationalDashboard({
  bedOccupancy,
  bedOccupancyByWard,
  resourceUtilization,
  staffOverview,
  queueStats,
  inventoryOverview,
  inventoryAlerts,
  emergencyStats,
  kpis,
  isLoading = false,
}: OperationalDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading operational dashboard...</p>
      </div>
    );
  }

  const criticalAlerts = inventoryAlerts?.filter((a) => a.severity === "critical") || [];

  return (
    <div className="space-y-6">
      {/* Critical Inventory Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Critical Inventory Alerts ({criticalAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {criticalAlerts.slice(0, 5).map((alert) => (
                <Badge key={alert.id} variant="destructive">
                  {alert.itemName}: {alert.type.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bed Occupancy & Emergency */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bed Occupancy */}
        {bedOccupancy && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bed className="h-5 w-5" />
                Bed Occupancy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    {bedOccupancy.occupiedBeds}/{bedOccupancy.totalBeds}
                  </p>
                  <p className="text-sm text-muted-foreground">Beds Occupied</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {bedOccupancy.occupancyRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                </div>
              </div>

              <Progress value={bedOccupancy.occupancyRate} />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {bedOccupancy.availableBeds}
                  </p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">
                    {bedOccupancy.blockedBeds}
                  </p>
                  <p className="text-xs text-muted-foreground">Blocked</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">
                    {bedOccupancy.maintenanceBeds}
                  </p>
                  <p className="text-xs text-muted-foreground">Maintenance</p>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span>Avg Length of Stay</span>
                <span className="font-medium">{bedOccupancy.averageLengthOfStay} days</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Emergency Department */}
        {emergencyStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Emergency Department
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{emergencyStats.currentPatients}</p>
                  <p className="text-sm text-muted-foreground">Current</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">
                    {emergencyStats.waitingTriage}
                  </p>
                  <p className="text-sm text-muted-foreground">Waiting Triage</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {emergencyStats.inTreatment}
                  </p>
                  <p className="text-sm text-muted-foreground">In Treatment</p>
                </div>
              </div>

              <div className="rounded-md bg-muted p-3">
                <div className="flex justify-between">
                  <span>Door to Doctor Time</span>
                  <span className="font-bold">{emergencyStats.doorToDoctor} min</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Wait Time</span>
                  <span className="font-medium">{emergencyStats.averageWaitTime} min</span>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-red-600">Left Without Being Seen</span>
                <span className="font-medium">{emergencyStats.leftWithoutBeingSeen}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Staff & Queues */}
      <div className="grid grid-cols-2 gap-6">
        {/* Staff Overview */}
        {staffOverview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{staffOverview.totalStaff}</p>
                  <p className="text-sm text-muted-foreground">Total Staff</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{staffOverview.onDuty}</p>
                  <p className="text-sm text-muted-foreground">On Duty</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{staffOverview.onLeave}</p>
                  <p className="text-sm text-muted-foreground">On Leave</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">By Role</p>
                {staffOverview.byRole?.slice(0, 4).map((role) => (
                  <div key={role.role} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{role.role}</span>
                    <span>
                      <span className="font-medium">{role.onDuty}</span>
                      <span className="text-muted-foreground">/{role.total}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground">Staff:Patient Ratio</p>
                <p className="text-xl font-bold">1:{staffOverview.staffPatientRatio}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Queue Stats */}
        {queueStats && queueStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Queue Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queueStats.slice(0, 4).map((queue) => (
                  <div key={queue.departmentId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{queue.departmentName}</span>
                      <Badge
                        variant={queue.currentWaiting > 10 ? "destructive" : "secondary"}
                      >
                        {queue.currentWaiting} waiting
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Avg wait: {queue.averageWaitTime} min</span>
                      <span>Served: {queue.servedToday}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bed Occupancy by Ward */}
      {bedOccupancyByWard && bedOccupancyByWard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Ward Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {bedOccupancyByWard.slice(0, 6).map((ward) => (
                <Card key={ward.wardId}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{ward.wardName}</p>
                      <Badge variant="outline">{ward.wardType}</Badge>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          {ward.occupiedBeds}/{ward.totalBeds}
                        </span>
                        <span>{ward.occupancyRate.toFixed(0)}%</span>
                      </div>
                      <Progress
                        value={ward.occupancyRate}
                        className={
                          ward.occupancyRate > 90
                            ? "[&>div]:bg-red-500"
                            : ward.occupancyRate > 75
                              ? "[&>div]:bg-amber-500"
                              : "[&>div]:bg-green-500"
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Overview */}
      {inventoryOverview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{inventoryOverview.totalItems}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {inventoryOverview.lowStockItems}
                </p>
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {inventoryOverview.outOfStockItems}
                </p>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {inventoryOverview.expiringItems}
                </p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  ${(inventoryOverview.totalValue / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      {kpis && (
        <Card>
          <CardHeader>
            <CardTitle>Operational KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{kpis.bedTurnoverRate}</p>
                <p className="text-sm text-muted-foreground">Bed Turnover</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{kpis.averageLengthOfStay} days</p>
                <p className="text-sm text-muted-foreground">Avg LOS</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{kpis.otUtilization}%</p>
                <p className="text-sm text-muted-foreground">OT Utilization</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{kpis.averageWaitTime} min</p>
                <p className="text-sm text-muted-foreground">Avg Wait Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

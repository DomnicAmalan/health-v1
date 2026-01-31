/**
 * Diagnostics Dashboard Component
 * Overview of Lab and Radiology statistics
 */

import { memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@lazarus-life/ui-components";
import {
  FlaskConical,
  Scan,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Droplet,
} from "lucide-react";
import type { LabDashboardStats, RadiologyDashboardStats } from "@lazarus-life/shared";

interface DiagnosticsDashboardProps {
  labStats?: LabDashboardStats;
  radiologyStats?: RadiologyDashboardStats;
  isLoading?: boolean;
}

export const DiagnosticsDashboard = memo(function DiagnosticsDashboard({
  labStats,
  radiologyStats,
  isLoading = false,
}: DiagnosticsDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lab Stats */}
      {labStats && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <FlaskConical className="h-6 w-6" />
            Laboratory
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Orders
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {labStats.pendingOrders}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Collection
                </CardTitle>
                <Droplet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {labStats.pendingCollection}
                </div>
                <p className="text-xs text-muted-foreground">
                  Samples to collect
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Verification
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {labStats.pendingVerification}
                </div>
                <p className="text-xs text-muted-foreground">
                  Results to verify
                </p>
              </CardContent>
            </Card>

            <Card className={labStats.criticalResults > 0 ? "border-red-200" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Critical Results
                </CardTitle>
                <AlertTriangle
                  className={`h-4 w-4 ${labStats.criticalResults > 0 ? "text-red-500" : "text-muted-foreground"}`}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${labStats.criticalResults > 0 ? "text-red-600" : ""}`}
                >
                  {labStats.criticalResults}
                </div>
                <p className="text-xs text-muted-foreground">
                  Require notification
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lab Performance */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Tests</p>
                    <p className="text-2xl font-bold">
                      {labStats.testsCompletedToday}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg TAT</p>
                    <p className="text-2xl font-bold">
                      {labStats.averageTAT || "-"} hrs
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Samples in Lab
                    </p>
                    <p className="text-2xl font-bold">
                      {labStats.samplesInLab}
                    </p>
                  </div>
                  <FlaskConical className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Radiology Stats */}
      {radiologyStats && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Scan className="h-6 w-6" />
            Radiology
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Scheduling
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {radiologyStats.pendingScheduling}
                </div>
                <p className="text-xs text-muted-foreground">
                  Orders to schedule
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Today's Exams
                </CardTitle>
                <Scan className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {radiologyStats.todayExams}
                </div>
                <p className="text-xs text-muted-foreground">
                  Scheduled for today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Reports
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {radiologyStats.pendingReports}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting interpretation
                </p>
              </CardContent>
            </Card>

            <Card
              className={
                radiologyStats.criticalFindings > 0 ? "border-red-200" : ""
              }
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Critical Findings
                </CardTitle>
                <AlertTriangle
                  className={`h-4 w-4 ${radiologyStats.criticalFindings > 0 ? "text-red-500" : "text-muted-foreground"}`}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${radiologyStats.criticalFindings > 0 ? "text-red-600" : ""}`}
                >
                  {radiologyStats.criticalFindings}
                </div>
                <p className="text-xs text-muted-foreground">
                  Require notification
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Radiology Performance */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Exams Completed Today
                    </p>
                    <p className="text-2xl font-bold">
                      {radiologyStats.examsCompletedToday}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Reports Signed Today
                    </p>
                    <p className="text-2xl font-bold">
                      {radiologyStats.reportsSignedToday}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Available Rooms
                    </p>
                    <p className="text-2xl font-bold">
                      {radiologyStats.availableRooms} /{" "}
                      {radiologyStats.totalRooms}
                    </p>
                  </div>
                  <Scan className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* No data state */}
      {!labStats && !radiologyStats && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <FlaskConical className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">
            No diagnostics data available
          </p>
        </div>
      )}
    </div>
  );
});

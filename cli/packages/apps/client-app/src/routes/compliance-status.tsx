/**
 * Compliance Status Page
 * Compliance dashboard with audit trail, PHI access, and training overview
 */

import { useState } from "react";
import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import {
  Badge,
  Box,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Flex,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Eye,
  GraduationCap,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import {
  useComplianceDashboardSummary,
  useAuditStats,
  usePHIAccessReport,
  useTrainingOverview,
  useComplianceOverview,
} from "@/hooks/api/analytics";

export const Route = createFileRoute("/compliance-status")({
  component: ComplianceStatusComponent,
});

function ComplianceStatusComponent() {
  return (
    <ProtectedRoute
      requiredPermission={PERMISSIONS.ANALYTICS?.VIEW || "analytics:view"}
      resource="compliance"
    >
      <ComplianceStatusPageInner />
    </ProtectedRoute>
  );
}

function ComplianceStatusPageInner() {
  const [activeTab, setActiveTab] = useState("overview");

  // Data hooks
  const { data: summary, isLoading: summaryLoading } = useComplianceDashboardSummary();
  const { data: auditStats, isLoading: auditLoading } = useAuditStats();
  const { data: phiAccess, isLoading: phiLoading } = usePHIAccessReport();
  const { data: training, isLoading: trainingLoading } = useTrainingOverview();
  const { data: compliance } = useComplianceOverview();

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" gap="md">
        <Shield className="h-8 w-8 text-blue-600" />
        <Box>
          <h1 className="text-3xl font-bold">Compliance Status</h1>
          <p className="text-muted-foreground mt-1">
            HIPAA compliance monitoring, audit trails, and security metrics
          </p>
        </Box>
      </Flex>

      {/* Stats Cards */}
      <Box className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("overview")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">
                  {compliance?.overallScore != null
                    ? `${compliance.overallScore}%`
                    : "-"}
                </p>
                <p className="text-sm text-muted-foreground">Compliance Score</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("audit")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Activity className="h-6 w-6 text-blue-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">
                  {auditStats?.totalEvents ?? "-"}
                </p>
                <p className="text-sm text-muted-foreground">Audit Events (24h)</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("phi")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Eye className="h-6 w-6 text-purple-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">
                  {phiAccess?.totalAccesses ?? "-"}
                </p>
                <p className="text-sm text-muted-foreground">PHI Accesses</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("training")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <GraduationCap className="h-6 w-6 text-yellow-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">
                  {training?.completionRate != null
                    ? `${training.completionRate}%`
                    : "-"}
                </p>
                <p className="text-sm text-muted-foreground">Training Completion</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Activity className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="phi" className="gap-2">
            <Eye className="h-4 w-4" />
            PHI Access
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Training
          </TabsTrigger>
        </TabsList>

        <Box className="mt-4">
          {/* Overview Tab */}
          <TabsContent value="overview">
            {summaryLoading ? (
              <Box className="text-center py-8 text-muted-foreground">Loading compliance summary...</Box>
            ) : (
              <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      Compliance Overview
                    </CardTitle>
                    <CardDescription>Current compliance posture</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {compliance ? (
                      <Box className="space-y-3">
                        <Flex justify="between">
                          <span className="text-sm text-muted-foreground">Overall Score</span>
                          <Badge variant={compliance.overallScore >= 90 ? "default" : "destructive"}>
                            {compliance.overallScore}%
                          </Badge>
                        </Flex>
                        {compliance.status && (
                          <Flex justify="between">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge variant="outline" className="capitalize">{compliance.status}</Badge>
                          </Flex>
                        )}
                      </Box>
                    ) : (
                      <p className="text-sm text-muted-foreground">No compliance data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>Last 24 hours summary</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {summary ? (
                      <Box className="space-y-3">
                        {summary.auditEventsLast24h != null && (
                          <Flex justify="between">
                            <span className="text-sm text-muted-foreground">Audit Events</span>
                            <span className="font-medium">{summary.auditEventsLast24h}</span>
                          </Flex>
                        )}
                        {summary.phiAccessesLast24h != null && (
                          <Flex justify="between">
                            <span className="text-sm text-muted-foreground">PHI Accesses</span>
                            <span className="font-medium">{summary.phiAccessesLast24h}</span>
                          </Flex>
                        )}
                        {summary.alertsCount != null && (
                          <Flex justify="between">
                            <span className="text-sm text-muted-foreground">Open Alerts</span>
                            <Badge variant={summary.alertsCount > 0 ? "destructive" : "default"}>
                              {summary.alertsCount}
                            </Badge>
                          </Flex>
                        )}
                      </Box>
                    ) : (
                      <p className="text-sm text-muted-foreground">No summary data available</p>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit">
            {auditLoading ? (
              <Box className="text-center py-8 text-muted-foreground">Loading audit data...</Box>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Audit Trail
                  </CardTitle>
                  <CardDescription>System audit events and activity logs</CardDescription>
                </CardHeader>
                <CardContent>
                  {auditStats ? (
                    <Box className="space-y-3">
                      <Flex justify="between">
                        <span className="text-sm text-muted-foreground">Total Events</span>
                        <span className="font-medium">{auditStats.totalEvents}</span>
                      </Flex>
                      {auditStats.uniqueUsers != null && (
                        <Flex justify="between">
                          <span className="text-sm text-muted-foreground">Unique Users</span>
                          <span className="font-medium">{auditStats.uniqueUsers}</span>
                        </Flex>
                      )}
                      {auditStats.failedLogins != null && (
                        <Flex justify="between">
                          <span className="text-sm text-muted-foreground">Failed Logins</span>
                          <Badge variant={auditStats.failedLogins > 0 ? "destructive" : "default"}>
                            {auditStats.failedLogins}
                          </Badge>
                        </Flex>
                      )}
                    </Box>
                  ) : (
                    <p className="text-sm text-muted-foreground">No audit data available</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PHI Access Tab */}
          <TabsContent value="phi">
            {phiLoading ? (
              <Box className="text-center py-8 text-muted-foreground">Loading PHI access data...</Box>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    PHI Access Logs
                  </CardTitle>
                  <CardDescription>Protected Health Information access monitoring</CardDescription>
                </CardHeader>
                <CardContent>
                  {phiAccess ? (
                    <Box className="space-y-3">
                      <Flex justify="between">
                        <span className="text-sm text-muted-foreground">Total Accesses</span>
                        <span className="font-medium">{phiAccess.totalAccesses}</span>
                      </Flex>
                      {phiAccess.uniqueUsers != null && (
                        <Flex justify="between">
                          <span className="text-sm text-muted-foreground">Unique Users</span>
                          <span className="font-medium">{phiAccess.uniqueUsers}</span>
                        </Flex>
                      )}
                      {phiAccess.uniquePatients != null && (
                        <Flex justify="between">
                          <span className="text-sm text-muted-foreground">Patients Accessed</span>
                          <span className="font-medium">{phiAccess.uniquePatients}</span>
                        </Flex>
                      )}
                    </Box>
                  ) : (
                    <p className="text-sm text-muted-foreground">No PHI access data available</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training">
            {trainingLoading ? (
              <Box className="text-center py-8 text-muted-foreground">Loading training data...</Box>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Training Programs
                  </CardTitle>
                  <CardDescription>Staff compliance training completion rates</CardDescription>
                </CardHeader>
                <CardContent>
                  {training ? (
                    <Box className="space-y-3">
                      {training.completionRate != null && (
                        <Flex justify="between">
                          <span className="text-sm text-muted-foreground">Overall Completion</span>
                          <Badge variant={training.completionRate >= 90 ? "default" : "destructive"}>
                            {training.completionRate}%
                          </Badge>
                        </Flex>
                      )}
                      {training.totalEnrolled != null && (
                        <Flex justify="between">
                          <span className="text-sm text-muted-foreground">Total Enrolled</span>
                          <span className="font-medium">{training.totalEnrolled}</span>
                        </Flex>
                      )}
                      {training.overdueCount != null && (
                        <Flex justify="between">
                          <span className="text-sm text-muted-foreground">Overdue</span>
                          <Badge variant={training.overdueCount > 0 ? "destructive" : "default"}>
                            {training.overdueCount}
                          </Badge>
                        </Flex>
                      )}
                    </Box>
                  ) : (
                    <p className="text-sm text-muted-foreground">No training data available</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Box>
      </Tabs>
    </Box>
  );
}

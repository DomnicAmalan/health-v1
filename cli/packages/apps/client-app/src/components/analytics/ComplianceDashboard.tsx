/**
 * Compliance Dashboard Component
 * Overview of audit logs, PHI access, compliance status, training, and security
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
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Lock,
  Calendar,
} from "lucide-react";
import type {
  AuditStats,
  PHIAccessReport,
  PHIAccessAlert,
  ComplianceOverview,
  ComplianceByRegulation,
  ComplianceDeadline,
  TrainingOverview,
  SecurityMetrics,
} from "@lazarus-life/shared";

interface ComplianceDashboardProps {
  auditStats?: AuditStats;
  phiAccessReport?: PHIAccessReport;
  phiAlerts?: PHIAccessAlert[];
  complianceOverview?: ComplianceOverview;
  complianceByRegulation?: ComplianceByRegulation[];
  trainingOverview?: TrainingOverview;
  securityMetrics?: SecurityMetrics;
  onReviewPHIAlert?: (alertId: string) => void;
  isLoading?: boolean;
}

export const ComplianceDashboard = memo(function ComplianceDashboard({
  auditStats,
  phiAccessReport,
  phiAlerts,
  complianceOverview,
  complianceByRegulation,
  trainingOverview,
  securityMetrics,
  onReviewPHIAlert,
  isLoading = false,
}: ComplianceDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading compliance dashboard...</p>
      </div>
    );
  }

  const unreviewedAlerts = phiAlerts?.filter((a) => !a.reviewed) || [];
  const criticalDeadlines =
    complianceOverview?.upcomingDeadlines?.filter((d) => d.priority === "critical") || [];

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {(unreviewedAlerts.length > 0 || criticalDeadlines.length > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {unreviewedAlerts.length > 0 && (
              <div>
                <p className="mb-2 font-medium">Suspicious PHI Access ({unreviewedAlerts.length})</p>
                <div className="space-y-2">
                  {unreviewedAlerts.slice(0, 2).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between rounded-md bg-white p-3"
                    >
                      <div>
                        <p className="font-medium">{alert.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.flaggedReason.replace("_", " ")} - {alert.patientName}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => onReviewPHIAlert?.(alert.id)}>
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {criticalDeadlines.length > 0 && (
              <div>
                <p className="mb-2 font-medium">Critical Deadlines ({criticalDeadlines.length})</p>
                <div className="flex flex-wrap gap-2">
                  {criticalDeadlines.map((deadline) => (
                    <Badge key={deadline.id} variant="destructive">
                      {deadline.regulationName}: {new Date(deadline.dueDate).toLocaleDateString()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compliance Score & Security */}
      <div className="grid grid-cols-4 gap-4">
        {complianceOverview && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {complianceOverview.overallScore}%
              </div>
              <Progress
                value={complianceOverview.overallScore}
                className={
                  complianceOverview.overallScore >= 90
                    ? "[&>div]:bg-green-500"
                    : complianceOverview.overallScore >= 70
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-red-500"
                }
              />
            </CardContent>
          </Card>
        )}

        {auditStats && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Audit Events</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditStats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                PHI Access: {auditStats.phiAccessCount}
              </p>
            </CardContent>
          </Card>
        )}

        {trainingOverview && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Compliance</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trainingOverview.complianceRate}%</div>
              <p className="text-xs text-muted-foreground">
                {trainingOverview.overdueTraining} overdue
              </p>
            </CardContent>
          </Card>
        )}

        {securityMetrics && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityMetrics.mfaAdoption}%</div>
              <p className="text-xs text-muted-foreground">MFA Adoption</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* PHI Access & Audit */}
      <div className="grid grid-cols-2 gap-6">
        {/* PHI Access Report */}
        {phiAccessReport && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                PHI Access Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{phiAccessReport.totalAccess}</p>
                  <p className="text-sm text-muted-foreground">Total Access</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{phiAccessReport.uniquePatients}</p>
                  <p className="text-sm text-muted-foreground">Patients</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{phiAccessReport.uniqueUsers}</p>
                  <p className="text-sm text-muted-foreground">Users</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">By Purpose</p>
                {phiAccessReport.byPurpose?.map((item) => (
                  <div key={item.purpose} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{item.purpose}</span>
                    <span>
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit by Action */}
        {auditStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {auditStats.byAction?.map((action) => (
                  <div key={action.action} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{action.action}</span>
                      <span>{action.count}</span>
                    </div>
                    <Progress value={action.percentage} className="h-2" />
                  </div>
                ))}
              </div>

              {auditStats.failedAuthAttempts > 0 && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-600">
                    Failed Auth Attempts: {auditStats.failedAuthAttempts}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Compliance by Regulation */}
      {complianceByRegulation && complianceByRegulation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance by Regulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {complianceByRegulation.map((reg) => (
                <Card key={reg.regulationId}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{reg.regulationName}</p>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {reg.category}
                        </Badge>
                      </div>
                      <Badge
                        variant={
                          reg.status === "compliant"
                            ? "default"
                            : reg.status === "partial"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {reg.status === "compliant" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {reg.status}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Requirements Met</span>
                        <span>
                          {reg.metRequirements}/{reg.totalRequirements}
                        </span>
                      </div>
                      <Progress
                        value={(reg.metRequirements / reg.totalRequirements) * 100}
                        className={
                          reg.complianceScore >= 90
                            ? "[&>div]:bg-green-500"
                            : reg.complianceScore >= 70
                              ? "[&>div]:bg-amber-500"
                              : "[&>div]:bg-red-500"
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

      {/* Training & Security */}
      <div className="grid grid-cols-2 gap-6">
        {/* Training Overview */}
        {trainingOverview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Training Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {trainingOverview.compliantStaff}
                  </p>
                  <p className="text-sm text-muted-foreground">Compliant</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {trainingOverview.overdueTraining}
                  </p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>

              <Progress value={trainingOverview.complianceRate} />

              <div className="space-y-2">
                <p className="text-sm font-medium">Upcoming Expirations</p>
                {trainingOverview.upcomingExpirations?.slice(0, 3).map((exp) => (
                  <div
                    key={`${exp.userId}-${exp.programId}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{exp.userName}</span>
                    <Badge
                      variant={exp.daysUntilExpiration <= 7 ? "destructive" : "secondary"}
                    >
                      {exp.daysUntilExpiration} days
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Metrics */}
        {securityMetrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md bg-muted p-3 text-center">
                  <p className="text-2xl font-bold">{securityMetrics.activesSessions}</p>
                  <p className="text-sm text-muted-foreground">Active Sessions</p>
                </div>
                <div
                  className={`rounded-md p-3 text-center ${securityMetrics.failedLoginAttempts > 10 ? "bg-red-50" : "bg-muted"}`}
                >
                  <p className="text-2xl font-bold">{securityMetrics.failedLoginAttempts}</p>
                  <p className="text-sm text-muted-foreground">Failed Logins</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Locked Accounts</span>
                  <span>{securityMetrics.lockedAccounts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Password Resets</span>
                  <span>{securityMetrics.passwordResets}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Suspicious Activities</span>
                  <span
                    className={securityMetrics.suspiciousActivities > 0 ? "text-red-600" : ""}
                  >
                    {securityMetrics.suspiciousActivities}
                  </span>
                </div>
              </div>

              {securityMetrics.securityIncidents?.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-600">
                    {securityMetrics.securityIncidents.length} Security Incident(s)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
});

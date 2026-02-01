/**
 * Analytics Page
 * Comprehensive dashboards for clinical, financial, operational, and compliance analytics
 */

import { useState, useCallback } from "react";
import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { createFileRoute } from "@tanstack/react-router";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lazarus-life/ui-components";
import {
  BarChart3,
  Activity,
  DollarSign,
  Building,
  Shield,
  Download,
  RefreshCw,
} from "lucide-react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import {
  ClinicalDashboard,
  FinancialDashboard,
  OperationalDashboard,
  ComplianceDashboard,
  ComprehensiveDashboard,
} from "@/components/analytics";
import {
  // Clinical hooks
  usePatientCensus,
  useDepartmentStats,
  useTATMetrics,
  useAppointmentStats,
  useClinicalAlerts,
  useAcknowledgeAlert,
  // Financial hooks
  useRevenueOverview,
  useRevenueByDepartment,
  useBillingStats,
  useBillingAgingReport,
  usePaymentStats,
  useFinancialKPIs,
  // Operational hooks
  useBedOccupancyByWard,
  useResourceUtilization,
  useStaffOverview,
  useQueueStats,
  useInventoryOverview,
  useInventoryAlerts,
  useEmergencyStats,
  useOperationalKPIs,
  // Compliance hooks
  useAuditStats,
  usePHIAccessReport,
  usePHIAlerts,
  useComplianceOverview,
  useComplianceByRegulation,
  useTrainingOverview,
  useSecurityMetrics,
  useReviewPHIAlert,
} from "@/hooks/api/analytics";
// Import useBedOccupancy directly to avoid conflict with departments
import { useBedOccupancy } from "@/hooks/api/analytics/useOperationalDashboard";
import type { TimePeriod } from "@lazarus-life/shared";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.ANALYTICS.VIEW} resource="analytics">
      <AnalyticsPageInner />
    </ProtectedRoute>
  );
}

function AnalyticsPageInner() {
  const [activeTab, setActiveTab] = useState("clinical");
  const [period, setPeriod] = useState<TimePeriod>("today");

  // Clinical Dashboard Queries
  const { data: census, isLoading: censusLoading, refetch: refetchCensus } = usePatientCensus();
  const { data: departmentStats } = useDepartmentStats();
  const { data: tatMetrics } = useTATMetrics();
  const { data: appointmentStats } = useAppointmentStats();
  const { data: clinicalAlerts } = useClinicalAlerts();
  const acknowledgeAlertMutation = useAcknowledgeAlert();

  // Financial Dashboard Queries
  const { data: revenueOverview, isLoading: revenueLoading } = useRevenueOverview(period);
  const { data: revenueByDepartment } = useRevenueByDepartment(period);
  const { data: billingStats } = useBillingStats();
  const { data: agingReport } = useBillingAgingReport();
  const { data: paymentStats } = usePaymentStats(period);
  const { data: financialKPIs } = useFinancialKPIs(period);

  // Operational Dashboard Queries
  const { data: bedOccupancy, isLoading: bedLoading } = useBedOccupancy();
  const { data: bedOccupancyByWard } = useBedOccupancyByWard();
  const { data: resourceUtilization } = useResourceUtilization();
  const { data: staffOverview } = useStaffOverview();
  const { data: queueStats } = useQueueStats();
  const { data: inventoryOverview } = useInventoryOverview();
  const { data: inventoryAlerts } = useInventoryAlerts();
  const { data: emergencyStats } = useEmergencyStats();
  const { data: operationalKPIs } = useOperationalKPIs();

  // Compliance Dashboard Queries
  const { data: auditStats, isLoading: auditLoading } = useAuditStats(period);
  const { data: phiAccessReport } = usePHIAccessReport(period);
  const { data: phiAlerts } = usePHIAlerts();
  const { data: complianceOverview } = useComplianceOverview();
  const { data: complianceByRegulation } = useComplianceByRegulation();
  const { data: trainingOverview } = useTrainingOverview();
  const { data: securityMetrics } = useSecurityMetrics();
  const reviewPHIAlertMutation = useReviewPHIAlert();

  // Handlers
  const handleAcknowledgeAlert = useCallback(
    async (alertId: string) => {
      await acknowledgeAlertMutation.mutateAsync(alertId);
    },
    [acknowledgeAlertMutation]
  );

  const handleReviewPHIAlert = useCallback(
    async (alertId: string) => {
      await reviewPHIAlertMutation.mutateAsync(alertId);
    },
    [reviewPHIAlertMutation]
  );

  const handleRefresh = useCallback(() => {
    if (activeTab === "clinical") {
      refetchCensus();
    }
  }, [activeTab, refetchCensus]);

  const isLoading =
    activeTab === "clinical"
      ? censusLoading
      : activeTab === "financial"
        ? revenueLoading
        : activeTab === "operational"
          ? bedLoading
          : auditLoading;

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Analytics & Reports</h1>
            <p className="text-muted-foreground">
              Comprehensive dashboards and reporting
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="clinical" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Clinical
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="operational" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Operational
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="cube" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Cube Analytics
          </TabsTrigger>
        </TabsList>

        {/* Clinical Dashboard */}
        <TabsContent value="clinical">
          <ClinicalDashboard
            census={census}
            departmentStats={departmentStats}
            tatMetrics={tatMetrics}
            appointmentStats={appointmentStats}
            alerts={clinicalAlerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            isLoading={censusLoading}
          />
        </TabsContent>

        {/* Financial Dashboard */}
        <TabsContent value="financial">
          <FinancialDashboard
            revenueOverview={revenueOverview}
            revenueByDepartment={revenueByDepartment}
            billingStats={billingStats}
            agingReport={agingReport}
            paymentStats={paymentStats}
            kpis={financialKPIs}
            isLoading={revenueLoading}
          />
        </TabsContent>

        {/* Operational Dashboard */}
        <TabsContent value="operational">
          <OperationalDashboard
            bedOccupancy={bedOccupancy}
            bedOccupancyByWard={bedOccupancyByWard}
            resourceUtilization={resourceUtilization}
            staffOverview={staffOverview}
            queueStats={queueStats}
            inventoryOverview={inventoryOverview}
            inventoryAlerts={inventoryAlerts}
            emergencyStats={emergencyStats}
            kpis={operationalKPIs}
            isLoading={bedLoading}
          />
        </TabsContent>

        {/* Compliance Dashboard */}
        <TabsContent value="compliance">
          <ComplianceDashboard
            auditStats={auditStats}
            phiAccessReport={phiAccessReport}
            phiAlerts={phiAlerts}
            complianceOverview={complianceOverview}
            complianceByRegulation={complianceByRegulation}
            trainingOverview={trainingOverview}
            securityMetrics={securityMetrics}
            onReviewPHIAlert={handleReviewPHIAlert}
            isLoading={auditLoading}
          />
        </TabsContent>

        {/* Cube.js Analytics Dashboard */}
        <TabsContent value="cube">
          <ComprehensiveDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

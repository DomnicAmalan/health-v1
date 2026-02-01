/**
 * Comprehensive Analytics Dashboard
 * Combines all analytics components for a complete view
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@lazarus-life/ui-components";
import { CubeProvider } from '@cubejs-client/react';
import { cubejsApi } from "@/lib/analytics/cubeClient";
import { ClinicalMetrics } from "./ClinicalMetrics";
import { DepartmentBreakdown } from "./DepartmentBreakdown";
import { PatientDemographics } from "./PatientDemographics";
import { PatientGrowthChart } from "./PatientGrowthChart";
import { RevenueByInsurance } from "./RevenueByInsurance";
import { RevenueMetrics } from "./RevenueMetrics";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { VisitTrendChart } from "./VisitTrendChart";

export function ComprehensiveDashboard() {
  return (
    <CubeProvider cubejsApi={cubejsApi}>
      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive analytics powered by Cube.js
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="clinical">Clinical</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <RevenueMetrics />
                <ClinicalMetrics />
              </div>
              <div className="space-y-4">
                <RevenueTrendChart />
                <VisitTrendChart />
              </div>
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <RevenueMetrics />
            <div className="grid gap-4 md:grid-cols-2">
              <RevenueTrendChart />
              <RevenueByInsurance />
            </div>
          </TabsContent>

          {/* Clinical Tab */}
          <TabsContent value="clinical" className="space-y-4">
            <ClinicalMetrics />
            <div className="grid gap-4 md:grid-cols-2">
              <VisitTrendChart />
              <DepartmentBreakdown />
            </div>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-4">
            <PatientGrowthChart />
            <PatientDemographics />
          </TabsContent>
        </Tabs>
      </div>
    </CubeProvider>
  );
}

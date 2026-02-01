/**
 * Revenue Dashboard
 * Cube.js-powered financial analytics
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { createFileRoute } from "@tanstack/react-router";
import { CubeProvider } from '@cubejs-client/react';
import { cubejsApi } from "@/lib/analytics/cubeClient";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { RevenueMetrics } from "@/components/analytics/RevenueMetrics";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { RevenueByInsurance } from "@/components/analytics/RevenueByInsurance";

export const Route = createFileRoute("/revenue")({
  component: RevenueComponent,
});

function RevenueComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.REVENUE.VIEW} resource="revenue">
      <RevenueComponentInner />
    </ProtectedRoute>
  );
}

function RevenueComponentInner() {
  return (
    <CubeProvider cubejsApi={cubejsApi}>
      <div className="container mx-auto space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Revenue & Financial Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Real-time revenue analytics powered by Cube.js
          </p>
        </div>

        {/* KPI Metrics */}
        <RevenueMetrics />

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <RevenueTrendChart />
          <RevenueByInsurance />
        </div>
      </div>
    </CubeProvider>
  );
}

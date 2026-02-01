/**
 * Revenue Dashboard - Example Integration
 * Combines Cube.js analytics components
 */

import { CubeProvider } from '@cubejs-client/react';
import { cubejsApi } from "@/lib/analytics/cubeClient";
import { RevenueMetrics } from "./RevenueMetrics";
import { RevenueTrendChart } from "./RevenueTrendChart";

export function RevenueDashboard() {
  return (
    <CubeProvider cubejsApi={cubejsApi}>
      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Revenue Analytics</h2>
          <p className="text-muted-foreground">
            Real-time revenue metrics powered by Cube.js
          </p>
        </div>

        {/* KPI Metrics */}
        <RevenueMetrics />

        {/* Trend Chart */}
        <RevenueTrendChart />

        {/* Add more components here */}
      </div>
    </CubeProvider>
  );
}

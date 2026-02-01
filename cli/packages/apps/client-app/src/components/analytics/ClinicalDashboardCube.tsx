/**
 * Clinical Dashboard - Example Integration
 * Combines Cube.js clinical analytics components
 */

import { CubeProvider } from '@cubejs-client/react';
import { cubejsApi } from "@/lib/analytics/cubeClient";
import { ClinicalMetrics } from "./ClinicalMetrics";
import { VisitTrendChart } from "./VisitTrendChart";
import { DepartmentBreakdown } from "./DepartmentBreakdown";

export function ClinicalDashboardCube() {
  return (
    <CubeProvider cubejsApi={cubejsApi}>
      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clinical Analytics</h2>
          <p className="text-muted-foreground">
            Patient and visit metrics powered by Cube.js
          </p>
        </div>

        {/* KPI Metrics */}
        <ClinicalMetrics />

        {/* Charts Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <VisitTrendChart />
          <DepartmentBreakdown />
        </div>

        {/* Add more components here */}
      </div>
    </CubeProvider>
  );
}

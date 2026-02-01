/**
 * Clinical Metrics Dashboard Component
 * Uses Cube.js for clinical analytics
 */

import { Card, CardContent, CardHeader, CardTitle } from "@lazarus-life/ui-components";
import { useCubeQuery } from '@cubejs-client/react';
import { Activity, TrendingUp, Users } from "lucide-react";
import { cubejsApi, formatNumber } from "@/lib/analytics/cubeClient";

interface ClinicalMetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  isLoading?: boolean;
}

function ClinicalMetricCard({ title, value, icon, subtitle, isLoading }: ClinicalMetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ClinicalMetrics() {
  // Total visits and patients this month
  const { resultSet: currentMonth, isLoading } = useCubeQuery(
    {
      measures: ['Clinical.visitCount', 'Clinical.patientCount', 'Clinical.avgVisitsPerPatient'],
      timeDimensions: [
        {
          dimension: 'Clinical.visitDate',
          dateRange: 'This month',
        },
      ],
    },
    { cubejsApi }
  );

  // Today's visits
  const { resultSet: today } = useCubeQuery(
    {
      measures: ['Clinical.visitCount'],
      timeDimensions: [
        {
          dimension: 'Clinical.visitDate',
          dateRange: 'Today',
        },
      ],
    },
    { cubejsApi }
  );

  const currentData = currentMonth?.tablePivot()[0];
  const todayData = today?.tablePivot()[0];

  const totalVisits = currentData?.['Clinical.visitCount'] as number || 0;
  const totalPatients = currentData?.['Clinical.patientCount'] as number || 0;
  const avgVisits = currentData?.['Clinical.avgVisitsPerPatient'] as number || 0;
  const todayVisits = todayData?.['Clinical.visitCount'] as number || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <ClinicalMetricCard
        title="Total Visits"
        value={formatNumber(totalVisits)}
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        subtitle="This month"
        isLoading={isLoading}
      />
      <ClinicalMetricCard
        title="Active Patients"
        value={formatNumber(totalPatients)}
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        subtitle="This month"
        isLoading={isLoading}
      />
      <ClinicalMetricCard
        title="Visits Per Patient"
        value={avgVisits.toFixed(1)}
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        subtitle="Average this month"
        isLoading={isLoading}
      />
      <ClinicalMetricCard
        title="Today's Visits"
        value={formatNumber(todayVisits)}
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        subtitle={new Date().toLocaleDateString()}
        isLoading={isLoading}
      />
    </div>
  );
}
